/**
 * Translate missing Lingui catalog entries using the OpenAI Chat Completions
 * API.
 *
 * Reads each target locale's `messages.po` file under `src/i18n/locales/`,
 * finds `msgstr` entries that are still empty (untranslated), optionally
 * narrows to a scope (subset of source files referenced by the entry's
 * `#:` comments), batches the strings, and asks an OpenAI model to
 * translate them. The model returns a JSON object keyed by msgid so we
 * can write each translation back into the catalog without re-ordering
 * or losing comments.
 *
 * Run `pnpm i18n:translate-llm --help` to see the full CLI usage.
 *
 * Env:
 *   OPENAI_API_KEY  required. Loaded from .env.development (and, as a
 *                   fallback for compatibility with the Supabase edge
 *                   convention, .env.development.edge).
 *   I18N_LLM_MODEL  optional. Defaults to `gpt-4o-mini`.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const LOCALES_DIR = path.join(PROJECT_ROOT, "src", "i18n", "locales");
const SOURCE_LOCALE = "en";
const DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Locale code → human label used in the prompt. Keep in sync with
 * `src/i18n/locales.ts` and the `locales` array in `lingui.config.ts`.
 */
export const TARGET_LOCALE_NAMES: Record<string, string> = {
  es: "Spanish (Latin American, formal but warm)",
  pt: "Portuguese (Brazilian, formal but warm)",
  fr: "French (formal but warm)",
  sw: "Swahili (East African standard)",
  ar: "Arabic (Modern Standard, right-to-left)",
  "zh-Hans": "Simplified Chinese (Mainland China conventions)",
  "zh-Hant": "Traditional Chinese (Taiwan conventions)",
};

export type PoEntry = {
  /** Comment block + msgid header preceding the msgstr line. */
  header: string;
  msgid: string;
  /** Empty string when untranslated. */
  msgstr: string;
};

export type ParsedPo = {
  /** PO file preamble (the metadata block at the top). */
  preamble: string;
  entries: PoEntry[];
};

export type CliOptions = {
  help: boolean;
  all: boolean;
  dryRun: boolean;
  scopes: string[];
  locales: string[];
  model: string | undefined;
};

export type ParseArgsResult =
  | { ok: true; options: CliOptions }
  | { ok: false; error: string };

function unescapePoString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function escapePoString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

/** Collects the value out of `msgid "..."` / `msgstr "..."` (multiline). */
function readMessageValue(
  lines: string[],
  startIdx: number,
): { value: string; consumed: number } {
  const first = lines[startIdx] ?? "";
  const match = first.match(/^(?:msgid|msgstr)\s+"(.*)"\s*$/);
  if (!match) return { value: "", consumed: 1 };
  const parts: string[] = [match[1] ?? ""];
  let i = startIdx + 1;
  while (i < lines.length) {
    const cont = (lines[i] ?? "").match(/^"(.*)"\s*$/);
    if (!cont) break;
    parts.push(cont[1] ?? "");
    i++;
  }
  return { value: unescapePoString(parts.join("")), consumed: i - startIdx };
}

/**
 * Minimal PO parser sufficient for Lingui-generated catalogs.
 *
 * @param text Raw text of the .po file.
 * @returns Parsed structure with `preamble` (metadata block kept as-is)
 *   and `entries` (each `header` retains the original comments + msgid
 *   lines so we can filter by `#: source/path` references).
 */
export function parsePo(text: string): ParsedPo {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length && !lines[i]!.startsWith("msgid ")) i++;
  const preambleStart = 0;
  let cursor = i;
  cursor += readMessageValue(lines, cursor).consumed;
  while (cursor < lines.length && !lines[cursor]!.startsWith("msgstr ")) {
    cursor++;
  }
  cursor += readMessageValue(lines, cursor).consumed;
  while (cursor < lines.length && lines[cursor] === "") cursor++;
  const preamble = lines.slice(preambleStart, cursor).join("\n");

  const entries: PoEntry[] = [];
  let blockStart = cursor;
  while (cursor < lines.length) {
    if (lines[cursor]!.startsWith("msgid ")) {
      const headerLines = lines.slice(blockStart, cursor);
      const { value: msgid, consumed: midConsumed } = readMessageValue(
        lines,
        cursor,
      );
      const headerWithMsgid = [
        ...headerLines,
        ...lines.slice(cursor, cursor + midConsumed),
      ].join("\n");
      cursor += midConsumed;
      const { value: msgstr, consumed: mstrConsumed } = readMessageValue(
        lines,
        cursor,
      );
      cursor += mstrConsumed;
      entries.push({ header: headerWithMsgid, msgid, msgstr });
      while (cursor < lines.length && lines[cursor] === "") cursor++;
      blockStart = cursor;
    } else {
      cursor++;
    }
  }
  return { preamble, entries };
}

/**
 * Serialize a parsed PO structure back to text.
 */
export function serializePo(parsed: ParsedPo): string {
  const blocks: string[] = [parsed.preamble];
  for (const entry of parsed.entries) {
    const msgstrSerialized = `msgstr "${escapePoString(entry.msgstr)}"`;
    blocks.push(`${entry.header}\n${msgstrSerialized}`);
  }
  return blocks.join("\n\n") + "\n";
}

/**
 * Returns true if the entry's `#: ...` source-file reference comments
 * contain any of the given scope substrings. An empty `scopes` array
 * matches everything (no filtering).
 *
 * @param entry The PO entry whose header carries `#:` reference comments
 *   pointing at the source file(s) the msgid was extracted from.
 * @param scopes Substrings to match against those reference paths. Match
 *   is case-sensitive and substring-based, e.g. `WorkspaceSettingsPage`
 *   matches `src/views/WorkspaceSettingsPage/...`.
 */
export function entryMatchesScope(entry: PoEntry, scopes: string[]): boolean {
  if (scopes.length === 0) return true;
  const refLines = entry.header.split("\n").filter((l) => {
    return l.startsWith("#:");
  });
  if (refLines.length === 0) return false;
  const refsText = refLines.join("\n");
  return scopes.some((s) => {
    return refsText.includes(s);
  });
}

/**
 * Returns the human-readable help text for the CLI. Exported so tests
 * can assert on it without invoking the script.
 */
export function buildHelpText(): string {
  return [
    "Usage: pnpm i18n:translate-llm [options]",
    "",
    "Translate missing Lingui catalog entries into one or more locales using",
    "the OpenAI Chat Completions API. Reads .po files from src/i18n/locales/,",
    "fills empty msgstr entries, and writes the updated catalogs back.",
    "",
    "Required env (loaded automatically from .env.development; falls back to",
    ".env.development.edge for compatibility with the Supabase edge convention):",
    "  OPENAI_API_KEY    Your OpenAI API key.",
    "",
    "Optional env:",
    "  I18N_LLM_MODEL    OpenAI model to use. Defaults to gpt-4o-mini.",
    "",
    "Options:",
    "  -h, --help              Show this help and exit.",
    "      --all               Translate every empty msgstr in every non-source",
    "                          locale. Cannot be combined with --scope or",
    "                          --locale.",
    "      --scope <pattern>   Only translate entries whose #: source-file",
    "                          reference contains <pattern>. Repeatable, and",
    "                          can also be a comma-separated list. Examples:",
    "                            --scope WorkspaceSettingsPage",
    "                            --scope src/views/Settings,src/components/Foo",
    "      --locale <code>     Target locale (e.g. es, pt, fr, sw, ar,",
    "                          zh-Hans, zh-Hant). Repeatable, and can also be",
    "                          a comma-separated list. Defaults to every",
    "                          non-source locale when omitted with --all.",
    "      --model <name>      Override the OpenAI model. Same as setting",
    "                          I18N_LLM_MODEL.",
    "      --dry-run           Translate but don't write changes to disk.",
    "",
    "Examples:",
    "  # Translate ONLY the Workspace Settings page, ONLY into Spanish.",
    "  pnpm i18n:translate-llm --scope WorkspaceSettingsPage --locale es",
    "",
    "  # Translate every empty msgstr in every locale (full run).",
    "  pnpm i18n:translate-llm --all",
    "",
    "  # Dry-run Spanish translations for two scopes without writing.",
    "  pnpm i18n:translate-llm \\",
    "      --scope WorkspaceSettingsPage --scope src/views/Dashboard \\",
    "      --locale es --dry-run",
    "",
  ].join("\n");
}

/**
 * Parse the script's CLI arguments. Pure function — does not read env or
 * touch the filesystem, so it can be tested directly.
 *
 * @param argv The argv slice (i.e. without `node` / script path). Pass
 *   `process.argv.slice(2)` from the entrypoint.
 */
export function parseArgs(argv: string[]): ParseArgsResult {
  const options: CliOptions = {
    help: false,
    all: false,
    dryRun: false,
    scopes: [],
    locales: [],
    model: undefined,
  };

  const splitList = (s: string): string[] => {
    return s
      .split(",")
      .map((p) => {
        return p.trim();
      })
      .filter((p) => {
        return p.length > 0;
      });
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "--all") {
      options.all = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--scope") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("-")) {
        return { ok: false, error: "--scope requires a value" };
      }
      options.scopes.push(...splitList(next));
      i++;
    } else if (arg.startsWith("--scope=")) {
      options.scopes.push(...splitList(arg.slice("--scope=".length)));
    } else if (arg === "--locale") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("-")) {
        return { ok: false, error: "--locale requires a value" };
      }
      options.locales.push(...splitList(next));
      i++;
    } else if (arg.startsWith("--locale=")) {
      options.locales.push(...splitList(arg.slice("--locale=".length)));
    } else if (arg === "--model") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("-")) {
        return { ok: false, error: "--model requires a value" };
      }
      options.model = next;
      i++;
    } else if (arg.startsWith("--model=")) {
      options.model = arg.slice("--model=".length);
    } else {
      return { ok: false, error: `Unknown argument: ${arg}` };
    }
  }

  if (
    options.all &&
    (options.scopes.length > 0 || options.locales.length > 0)
  ) {
    return {
      ok: false,
      error: "--all cannot be combined with --scope or --locale",
    };
  }

  return { ok: true, options };
}

type TranslationBatch = Record<string, string>;

/**
 * Call OpenAI Chat Completions and return a `msgid -> translation` map.
 *
 * Exported so tests can stub it out via dependency injection without
 * needing to monkey-patch `globalThis.fetch`.
 */
export async function translateBatch(args: {
  locale: string;
  localeLabel: string;
  entries: Array<{ id: string; source: string }>;
  apiKey: string;
  model: string;
  /** Allows tests to inject a custom fetch. Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
}): Promise<TranslationBatch> {
  const { locale, localeLabel, entries, apiKey, model } = args;
  const fetchImpl = args.fetchImpl ?? globalThis.fetch;
  const systemPrompt = [
    `You are a professional software UI translator.`,
    `You translate short UI strings from English (en) into ${localeLabel} (${locale}).`,
    `Rules:`,
    `- Preserve placeholders like {name}, {count}, %s, and ICU plural forms exactly.`,
    `- Preserve any HTML/JSX tags exactly, but translate the text between them.`,
    `- Match the tone of professional SaaS product copy: concise, clear, neutral.`,
    `- Do NOT translate brand names, technical terms used as-is (e.g. SQL, CSV), or code.`,
    `- For Arabic, output proper RTL text without manual reversal.`,
    `- Return a JSON object mapping every input id to its translated string.`,
    `- Do not include any commentary, only the JSON object.`,
  ].join("\n");

  const userPayload = {
    target_language: localeLabel,
    target_locale: locale,
    strings: entries,
  };

  const response = await fetchImpl(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenAI request failed (${response.status}): ${body.slice(0, 400)}`,
    );
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response missing choices[0].message.content");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      `Could not parse JSON from model:\n${content.slice(0, 400)}`,
    );
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Model JSON was not an object");
  }
  const out: TranslationBatch = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/**
 * Translate a single locale: read its .po file, find empty msgstr entries
 * matching the scope filter, hit OpenAI, and write the catalog back.
 *
 * @returns `translated` (count actually filled) and `remaining` (count
 *   still empty within the scope).
 */
export async function processLocale(args: {
  locale: string;
  apiKey: string;
  model: string;
  dryRun: boolean;
  scopes: string[];
  fetchImpl?: typeof fetch;
}): Promise<{ translated: number; remaining: number }> {
  const { locale, apiKey, model, dryRun, scopes } = args;
  const localeLabel = TARGET_LOCALE_NAMES[locale];
  if (!localeLabel) {
    console.warn(`  · no label registered for ${locale}, skipping`);
    return { translated: 0, remaining: 0 };
  }
  const poPath = path.join(LOCALES_DIR, locale, "messages.po");
  let raw: string;
  try {
    raw = await fs.readFile(poPath, "utf8");
  } catch {
    console.warn(`  · no catalog at ${poPath}, run pnpm i18n:extract first`);
    return { translated: 0, remaining: 0 };
  }
  const parsed = parsePo(raw);
  const missing = parsed.entries.filter((e) => {
    return e.msgstr.trim() === "" && entryMatchesScope(e, scopes);
  });
  const scopeNote = scopes.length > 0 ? ` (scopes: ${scopes.join(", ")})` : "";
  console.log(
    `\n[${locale}] ${missing.length} missing of ${parsed.entries.length} entries${scopeNote}`,
  );
  if (missing.length === 0) return { translated: 0, remaining: 0 };

  const BATCH_SIZE = 40;
  const batches: Array<Array<{ id: string; source: string }>> = [];
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    batches.push(
      missing.slice(i, i + BATCH_SIZE).map((e, idx) => {
        return { id: `m${i + idx}`, source: e.msgid };
      }),
    );
  }

  let translatedCount = 0;
  let stillMissing = missing.length;
  for (const [batchIdx, batch] of batches.entries()) {
    console.log(
      `  · batch ${batchIdx + 1}/${batches.length} (${batch.length} strings)`,
    );
    const translations = await translateBatch({
      locale,
      localeLabel,
      entries: batch,
      apiKey,
      model,
      fetchImpl: args.fetchImpl,
    });
    for (const [idx, item] of batch.entries()) {
      const absoluteIdx = batchIdx * BATCH_SIZE + idx;
      const target =
        parsed.entries[parsed.entries.indexOf(missing[absoluteIdx]!)];
      const translated = translations[item.id];
      if (target && typeof translated === "string" && translated.trim()) {
        target.msgstr = translated;
        translatedCount++;
        stillMissing--;
      }
    }
  }

  if (dryRun) {
    console.log(`  · DRY RUN — not writing ${translatedCount} translations`);
  } else if (translatedCount > 0) {
    await fs.writeFile(poPath, serializePo(parsed), "utf8");
    console.log(`  · wrote ${translatedCount} translations to ${poPath}`);
  }
  return { translated: translatedCount, remaining: stillMissing };
}

/**
 * Load env vars from .env.development and .env.development.edge (the
 * latter holds the OpenAI key in our Supabase edge-function convention).
 * Already-set vars on `process.env` win over file values so callers can
 * still override on the command line.
 */
export function loadEnvFiles(): void {
  for (const file of [".env.development", ".env.development.edge"]) {
    dotenv.config({ path: path.join(PROJECT_ROOT, file), override: false });
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  // Print help when invoked with no arguments so humans and LLMs can
  // discover the script's options without having to read the source.
  if (argv.length === 0) {
    console.log(buildHelpText());
    process.exit(0);
  }

  const result = parseArgs(argv);
  if (!result.ok) {
    console.error(`Error: ${result.error}\n`);
    console.error(buildHelpText());
    process.exit(2);
  }
  const options = result.options;
  if (options.help) {
    console.log(buildHelpText());
    process.exit(0);
  }

  if (
    !options.all &&
    options.scopes.length === 0 &&
    options.locales.length === 0
  ) {
    console.error(
      "Error: pass --all, or narrow with --scope and/or --locale.\n",
    );
    console.error(buildHelpText());
    process.exit(2);
  }

  loadEnvFiles();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "OPENAI_API_KEY is not set. Add it to .env.development (or " +
        ".env.development.edge) before running this script.",
    );
    process.exit(1);
  }
  const model = options.model ?? process.env.I18N_LLM_MODEL ?? DEFAULT_MODEL;

  const dirEntries = await fs.readdir(LOCALES_DIR, { withFileTypes: true });
  const allLocales = dirEntries
    .filter((d) => {
      return d.isDirectory();
    })
    .map((d) => {
      return d.name;
    })
    .filter((l) => {
      return l !== SOURCE_LOCALE;
    });

  let targetLocales: string[];
  if (options.locales.length > 0) {
    const unknown = options.locales.filter((l) => {
      return !allLocales.includes(l);
    });
    if (unknown.length > 0) {
      console.error(
        `Error: unknown locale(s): ${unknown.join(", ")}. Available: ${allLocales.join(", ")}`,
      );
      process.exit(2);
    }
    targetLocales = options.locales;
  } else {
    targetLocales = allLocales;
  }

  const scopeNote =
    options.scopes.length > 0 ?
      ` scoped to [${options.scopes.join(", ")}]`
    : "";
  console.log(
    `Translating into: ${targetLocales.join(", ")} via model ${model}${scopeNote}` +
      (options.dryRun ? " (dry-run)" : ""),
  );

  for (const locale of targetLocales) {
    try {
      await processLocale({
        locale,
        apiKey,
        model,
        dryRun: options.dryRun,
        scopes: options.scopes,
      });
    } catch (err) {
      console.error(`  · ${locale} failed:`, err);
    }
  }
  console.log(
    "\nDone. Run `pnpm i18n:compile` to regenerate runtime catalogs.",
  );
}

// Skip the auto-run when imported under Vitest (so tests can pull in the
// pure helpers without spinning up the CLI). Vitest sets `VITEST=true`
// for every worker.
if (!process.env.VITEST) {
  void main();
}
