/**
 * LLM-backed translation of missing Lingui catalog entries via the OpenAI
 * Chat Completions API.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { makeObjectFromEntries } from "@utils";
import { LOCALES_DIR, OPENAI_URL, TARGET_LOCALE_NAMES } from "./config";
import { PoCatalog } from "./poCatalog";

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
  const parsed = PoCatalog.parse(raw);
  const missing = parsed.entries.filter((entry) => {
    return (
      entry.msgstr.trim() === "" && PoCatalog.entryMatchesScope(entry, scopes)
    );
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
    await fs.writeFile(poPath, PoCatalog.serialize(parsed), "utf8");
    console.log(`  · wrote ${translatedCount} translations to ${poPath}`);
  }
  return { translated: translatedCount, remaining: stillMissing };
}

/** Translates missing catalog entries through the configured LLM. */
export const CatalogTranslator = {
  localeNames: TARGET_LOCALE_NAMES,
  translateBatch: _translateBatch,
  processLocale: _processLocale,
};
