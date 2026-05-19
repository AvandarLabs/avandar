/**
 * Translate missing Lingui catalog entries using an LLM.
 *
 * Reads each locale's `messages.po` file under `src/i18n/locales/`, finds
 * `msgstr` entries that are still empty (i.e. untranslated), batches them
 * up, and asks the LLM to translate them into the target language. The
 * model returns a JSON object keyed by `msgid` so the script can write
 * each translation back into the catalog without re-ordering or losing
 * comments.
 *
 * Usage:
 *   pnpm i18n:translate-llm                # translate all non-source locales
 *   pnpm i18n:translate-llm -- fr es       # translate just FR + ES
 *   pnpm i18n:translate-llm -- --dry-run   # don't write, just print
 *
 * Env:
 *   OPEN_ROUTER_API_KEY   required (re-uses the same key the chat
 *                         backend uses, see supabase/functions/chat).
 *   I18N_LLM_MODEL        optional, defaults to anthropic/claude-sonnet-4.5
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const LOCALES_DIR = path.join(PROJECT_ROOT, "src", "i18n", "locales");
const SOURCE_LOCALE = "en";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

// Locale code -> human label used in the prompt. Keep in sync with
// `src/i18n/locales.ts`.
const TARGET_LOCALE_NAMES: Record<string, string> = {
  es: "Spanish (Latin American, formal but warm)",
  pt: "Portuguese (Brazilian, formal but warm)",
  fr: "French (formal but warm)",
  sw: "Swahili (East African standard)",
  ar: "Arabic (Modern Standard, right-to-left)",
  "zh-Hans": "Simplified Chinese (Mainland China conventions)",
  "zh-Hant": "Traditional Chinese (Taiwan conventions)",
};

type PoEntry = {
  /** Comment block + msgid header preceding the msgstr line. */
  header: string;
  msgid: string;
  /** Empty string when untranslated. */
  msgstr: string;
};

type ParsedPo = {
  /** PO file preamble (the metadata block at the top). */
  preamble: string;
  entries: PoEntry[];
};

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
): {
  value: string;
  consumed: number;
} {
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

/** Minimal PO parser sufficient for Lingui-generated catalogs. */
function parsePo(text: string): ParsedPo {
  const lines = text.split("\n");
  // Preamble: the first msgid is empty (`msgid ""`) and its msgstr holds
  // the metadata. We keep that block untouched.
  let i = 0;
  while (i < lines.length && !lines[i]!.startsWith("msgid ")) i++;
  // First msgid is the metadata header.
  const preambleStart = 0;
  // Find the start of the next entry (a blank line followed by a comment
  // or another msgid).
  let cursor = i;
  // Walk past the header msgid + its multiline msgstr.
  cursor += readMessageValue(lines, cursor).consumed;
  while (cursor < lines.length && !lines[cursor]!.startsWith("msgstr "))
    cursor++;
  cursor += readMessageValue(lines, cursor).consumed;
  // Skip trailing blank lines.
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
      // Skip blank line(s) between entries.
      while (cursor < lines.length && lines[cursor] === "") cursor++;
      blockStart = cursor;
    } else {
      cursor++;
    }
  }
  return { preamble, entries };
}

function serializePo(parsed: ParsedPo): string {
  const blocks: string[] = [parsed.preamble];
  for (const entry of parsed.entries) {
    const msgstrSerialized = `msgstr "${escapePoString(entry.msgstr)}"`;
    blocks.push(`${entry.header}\n${msgstrSerialized}`);
  }
  return blocks.join("\n\n") + "\n";
}

type TranslationBatch = Record<string, string>;

async function translateBatch(args: {
  locale: string;
  localeLabel: string;
  entries: Array<{ id: string; source: string }>;
  apiKey: string;
  model: string;
}): Promise<TranslationBatch> {
  const { locale, localeLabel, entries, apiKey, model } = args;
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

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://avandar.dev",
        "X-Title": "Avandar i18n translation script",
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
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenRouter request failed (${response.status}): ${body.slice(0, 400)}`,
    );
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter response missing choices[0].message.content");
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

async function processLocale(args: {
  locale: string;
  apiKey: string;
  model: string;
  dryRun: boolean;
}): Promise<{ translated: number; remaining: number }> {
  const { locale, apiKey, model, dryRun } = args;
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
    return e.msgstr.trim() === "";
  });
  console.log(
    `\n[${locale}] ${missing.length} missing of ${parsed.entries.length} entries`,
  );
  if (missing.length === 0) return { translated: 0, remaining: 0 };

  const BATCH_SIZE = 40;
  const batches: Array<Array<{ id: string; source: string }>> = [];
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    batches.push(
      missing.slice(i, i + BATCH_SIZE).map((e, idx) => {
        return {
          id: `m${i + idx}`,
          source: e.msgid,
        };
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const explicitLocales = args.filter((a) => {
    return !a.startsWith("--");
  });

  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    console.error(
      "OPEN_ROUTER_API_KEY is not set. Export it (or put it in " +
        ".env.development.edge) before running this script.",
    );
    process.exit(1);
  }
  const model = process.env.I18N_LLM_MODEL || DEFAULT_MODEL;

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

  const targetLocales =
    explicitLocales.length > 0 ?
      explicitLocales.filter((l) => {
        return allLocales.includes(l);
      })
    : allLocales;

  console.log(
    `Translating into: ${targetLocales.join(", ")} via model ${model}` +
      (dryRun ? " (dry-run)" : ""),
  );

  for (const locale of targetLocales) {
    try {
      await processLocale({ locale, apiKey, model, dryRun });
    } catch (err) {
      console.error(`  · ${locale} failed:`, err);
    }
  }
  console.log(
    "\nDone. Run `pnpm i18n:compile` to regenerate runtime catalogs.",
  );
}

void main();
