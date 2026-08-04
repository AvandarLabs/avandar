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
 * Most callers should use the higher-level `pnpm i18n:update-translations`
 * orchestrator (extract → translate → compile). Run this script directly via
 * `pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts --help`
 * for scoped runs without re-extracting or recompiling.
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
import { makeObjectFromEntries, prop } from "@utils";
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
const TARGET_LOCALE_NAMES: Record<string, string> = {
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

function _unescapePoString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function _escapePoString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

/** Collects the value out of `msgid "..."` / `msgstr "..."` (multiline). */
function _readMessageValue(
  lines: string[],
  startIdx: number,
): { value: string; consumed: number } {
  const first = lines[startIdx] ?? "";
  const match = first.match(/^(?:msgid|msgstr)\s+"(.*)"\s*$/);
  if (!match) {
    return { value: "", consumed: 1 };
  }
  const remainingLines = lines.slice(startIdx + 1);
  const firstNonContinuationIndex = remainingLines.findIndex((line) => {
    return !/^"(.*)"\s*$/.test(line);
  });
  const continuationCount =
    firstNonContinuationIndex === -1 ?
      remainingLines.length
    : firstNonContinuationIndex;
  const parts = [
    match[1] ?? "",
    ...remainingLines.slice(0, continuationCount).map((line) => {
      return /^"(.*)"\s*$/.exec(line)?.[1] ?? "";
    }),
  ];
  return {
    value: _unescapePoString(parts.join("")),
    consumed: continuationCount + 1,
  };
}

function _skipBlankLines(lines: string[], startIndex: number): number {
  const nonBlankOffset = lines.slice(startIndex).findIndex((line) => {
    return line !== "";
  });
  return nonBlankOffset === -1 ? lines.length : startIndex + nonBlankOffset;
}

/**
 * Minimal PO parser sufficient for Lingui-generated catalogs.
 *
 * @param text Raw text of the .po file.
 * @returns Parsed structure with `preamble` (metadata block kept as-is)
 *   and `entries` (each `header` retains the original comments + msgid
 *   lines so we can filter by `#: source/path` references).
 */
function _parsePo(text: string): ParsedPo {
  const lines = text.split("\n");
  const firstMessageIndex = lines.findIndex((line) => {
    return line.startsWith("msgid ");
  });
  const preambleStart = 0;
  let cursor = firstMessageIndex === -1 ? lines.length : firstMessageIndex;
  cursor += _readMessageValue(lines, cursor).consumed;
  const messageStringOffset = lines.slice(cursor).findIndex((line) => {
    return line.startsWith("msgstr ");
  });
  cursor =
    messageStringOffset === -1 ? lines.length : cursor + messageStringOffset;
  cursor += _readMessageValue(lines, cursor).consumed;
  // The preamble ends at the last header line. Blank lines that follow are
  // the separator before the first entry; we exclude them here so that
  // serializePo's `join("\n\n")` reintroduces exactly one. Including them
  // would yield a double blank line that Lingui's formatter strips on the
  // next `lingui extract`, producing a spurious diff.
  const preambleEnd = cursor;
  cursor = _skipBlankLines(lines, cursor);
  const preamble = lines.slice(preambleStart, preambleEnd).join("\n");

  const entries: PoEntry[] = [];
  let blockStart = cursor;
  while (cursor < lines.length) {
    if (lines[cursor]!.startsWith("msgid ")) {
      const headerLines = lines.slice(blockStart, cursor);
      const { value: msgid, consumed: midConsumed } = _readMessageValue(
        lines,
        cursor,
      );
      const headerWithMsgid = [
        ...headerLines,
        ...lines.slice(cursor, cursor + midConsumed),
      ].join("\n");
      cursor += midConsumed;
      const { value: msgstr, consumed: mstrConsumed } = _readMessageValue(
        lines,
        cursor,
      );
      cursor += mstrConsumed;
      entries.push({ header: headerWithMsgid, msgid, msgstr });
      cursor = _skipBlankLines(lines, cursor);
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
function _serializePo(parsed: ParsedPo): string {
  const entryBlocks = parsed.entries.map((entry) => {
    const msgstrSerialized = `msgstr "${_escapePoString(entry.msgstr)}"`;
    return `${entry.header}\n${msgstrSerialized}`;
  });
  return `${[parsed.preamble, ...entryBlocks].join("\n\n")}\n`;
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
function _entryMatchesScope(entry: PoEntry, scopes: string[]): boolean {
  if (scopes.length === 0) {
    return true;
  }
  const referenceLines = entry.header.split("\n").filter((line) => {
    return line.startsWith("#:");
  });
  if (referenceLines.length === 0) {
    return false;
  }
  const referencesText = referenceLines.join("\n");
  return scopes.some((scope) => {
    return referencesText.includes(scope);
  });
}

/**
 * Returns the human-readable help text for the CLI. Exported so tests
 * can assert on it without invoking the script.
 */
function _buildHelpText(): string {
  return [
    "Usage: pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts [options]",
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
    "  pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts \\",
    "      --scope WorkspaceSettingsPage --locale es",
    "",
    "  # Translate every empty msgstr in every locale (full run).",
    "  pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts --all",
    "",
    "  # Dry-run Spanish translations for two scopes without writing.",
    "  pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts \\",
    "      --scope WorkspaceSettingsPage --scope src/views/Dashboard \\",
    "      --locale es --dry-run",
    "",
  ].join("\n");
}

/**
 * Parse the script's CLI arguments. This pure function does not read env or
 * touch the filesystem, so it can be tested directly.
 *
 * @param argv The argv slice (i.e. without `node` / script path). Pass
 *   `process.argv.slice(2)` from the entrypoint.
 */
function _parseArgs(argv: string[]): ParseArgsResult {
  const options: CliOptions = {
    help: false,
    all: false,
    dryRun: false,
    scopes: [],
    locales: [],
    model: undefined,
  };

  const splitList = (value: string): string[] => {
    return value
      .split(",")
      .map((listValue) => {
        return listValue.trim();
      })
      .filter((listValue) => {
        return listValue.length > 0;
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
      const optionValue = argv[i + 1];
      if (optionValue === undefined || optionValue.startsWith("-")) {
        return { ok: false, error: "--scope requires a value" };
      }
      options.scopes.push(...splitList(optionValue));
      i++;
    } else if (arg.startsWith("--scope=")) {
      options.scopes.push(...splitList(arg.slice("--scope=".length)));
    } else if (arg === "--locale") {
      const optionValue = argv[i + 1];
      if (optionValue === undefined || optionValue.startsWith("-")) {
        return { ok: false, error: "--locale requires a value" };
      }
      options.locales.push(...splitList(optionValue));
      i++;
    } else if (arg.startsWith("--locale=")) {
      options.locales.push(...splitList(arg.slice("--locale=".length)));
    } else if (arg === "--model") {
      const optionValue = argv[i + 1];
      if (optionValue === undefined || optionValue.startsWith("-")) {
        return { ok: false, error: "--model requires a value" };
      }
      options.model = optionValue;
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
async function _translateBatch(args: {
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
  const parsed = (() => {
    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new Error(
        `Could not parse JSON from model:\n${content.slice(0, 400)}`,
      );
    }
  })();
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Model JSON was not an object");
  }
  const translations = Object.entries(parsed as Record<string, unknown>).filter(
    (entry): entry is [string, string] => {
      return typeof entry[1] === "string";
    },
  );
  return makeObjectFromEntries(translations);
}

/**
 * Translate a single locale: read its .po file, find empty msgstr entries
 * matching the scope filter, hit OpenAI, and write the catalog back.
 *
 * @returns `translated` (count actually filled) and `remaining` (count
 *   still empty within the scope).
 */
async function _processLocale(args: {
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
    console.warn(
      `  · no catalog at ${poPath}, run pnpm i18n:update-translations first`,
    );
    return { translated: 0, remaining: 0 };
  }
  const parsed = _parsePo(raw);
  const missing = parsed.entries.filter((entry) => {
    return entry.msgstr.trim() === "" && _entryMatchesScope(entry, scopes);
  });
  const scopeNote = scopes.length > 0 ? ` (scopes: ${scopes.join(", ")})` : "";
  console.log(
    `\n[${locale}] ${missing.length} missing of ${parsed.entries.length} entries${scopeNote}`,
  );
  if (missing.length === 0) {
    return { translated: 0, remaining: 0 };
  }

  const BATCH_SIZE = 40;
  const batches = Array.from(
    { length: Math.ceil(missing.length / BATCH_SIZE) },
    (_, batchIndex) => {
      const batchOffset = batchIndex * BATCH_SIZE;
      return missing
        .slice(batchOffset, batchOffset + BATCH_SIZE)
        .map((entry, entryIndex) => {
          return { id: `m${batchOffset + entryIndex}`, source: entry.msgid };
        });
    },
  );

  let translatedCount = 0;
  let stillMissing = missing.length;
  for (const [batchIdx, batch] of batches.entries()) {
    console.log(
      `  · batch ${batchIdx + 1}/${batches.length} (${batch.length} strings)`,
    );
    const translations = await _translateBatch({
      locale,
      localeLabel,
      entries: batch,
      apiKey,
      model,
      fetchImpl: args.fetchImpl,
    });
    batch.forEach((item, entryIndex) => {
      const absoluteIndex = batchIdx * BATCH_SIZE + entryIndex;
      const target = missing[absoluteIndex];
      const translated = translations[item.id];
      if (target && typeof translated === "string" && translated.trim()) {
        target.msgstr = translated;
        translatedCount++;
        stillMissing--;
      }
    });
  }

  if (dryRun) {
    console.log(`  · DRY RUN: not writing ${translatedCount} translations`);
  } else if (translatedCount > 0) {
    await fs.writeFile(poPath, _serializePo(parsed), "utf8");
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
function _loadEnvFiles(): void {
  [".env.development", ".env.development.edge"].forEach((file) => {
    dotenv.config({ path: path.join(PROJECT_ROOT, file), override: false });
  });
}

/** Parses, matches, and serializes Lingui PO catalogs. */
export const PoCatalog = {
  parse: _parsePo,
  serialize: _serializePo,
  entryMatchesScope: _entryMatchesScope,
};

/** Parses translation CLI options and builds its help output. */
export const TranslationCli = {
  parseArgs: _parseArgs,
  buildHelpText: _buildHelpText,
  loadEnvFiles: _loadEnvFiles,
};

/** Translates missing catalog entries through the configured LLM. */
export const CatalogTranslator = {
  localeNames: TARGET_LOCALE_NAMES,
  translateBatch: _translateBatch,
  processLocale: _processLocale,
};

async function _main(): Promise<void> {
  const argv = process.argv.slice(2);

  // Print help when invoked with no arguments so humans and LLMs can
  // discover the script's options without having to read the source.
  if (argv.length === 0) {
    console.log(_buildHelpText());
    process.exit(0);
  }

  const result = _parseArgs(argv);
  if (!result.ok) {
    console.error(`Error: ${result.error}\n`);
    console.error(_buildHelpText());
    process.exit(2);
  }
  const options = result.options;
  if (options.help) {
    console.log(_buildHelpText());
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
    console.error(_buildHelpText());
    process.exit(2);
  }

  _loadEnvFiles();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      `OPENAI_API_KEY is not set. Add it to .env.development (or ${".env.development.edge"}) before running this script.`,
    );
    process.exit(1);
  }
  const model = options.model ?? process.env.I18N_LLM_MODEL ?? DEFAULT_MODEL;

  const dirEntries = await fs.readdir(LOCALES_DIR, { withFileTypes: true });
  const allLocales = dirEntries
    .filter((directoryEntry) => {
      return directoryEntry.isDirectory();
    })
    .map(prop("name"))
    .filter((locale) => {
      return locale !== SOURCE_LOCALE;
    });

  if (options.locales.length > 0) {
    const unknown = options.locales.filter((locale) => {
      return !allLocales.includes(locale);
    });
    if (unknown.length > 0) {
      console.error(
        `Error: unknown locale(s): ${unknown.join(", ")}. Available: ${allLocales.join(", ")}`,
      );
      process.exit(2);
    }
  }
  const targetLocales =
    options.locales.length > 0 ? options.locales : allLocales;

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
      await _processLocale({
        locale,
        apiKey,
        model,
        dryRun: options.dryRun,
        scopes: options.scopes,
      });
    } catch (error) {
      console.error(`  · ${locale} failed:`, error);
    }
  }
  console.log(
    "\nDone. Run `pnpm exec lingui compile --typescript` to regenerate runtime catalogs (or use `pnpm i18n:update-translations` for the full extract → translate → compile pipeline).",
  );
}

// Skip the auto-run when imported under Vitest (so tests can pull in the
// pure helpers without spinning up the CLI). Vitest sets `VITEST=true`
// for every worker.
if (!process.env.VITEST) {
  void _main();
}
