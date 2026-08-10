/**
 * CLI orchestration for the LLM translation script: parse args, resolve the
 * target locales, and translate each one in turn.
 */

import { promises as fs } from "node:fs";
import process from "node:process";
import { prop } from "@avandar/utils";
import { CatalogTranslator } from "./catalogTranslator";
import { DEFAULT_MODEL, LOCALES_DIR, SOURCE_LOCALE } from "./config";
import { TranslationCli } from "./translationCli";

export async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  // Print help when invoked with no arguments so humans and LLMs can
  // discover the script's options without having to read the source.
  if (argv.length === 0) {
    console.log(TranslationCli.buildHelpText());
    process.exit(0);
  }

  const result = TranslationCli.parseArgs(argv);
  if (!result.ok) {
    console.error(`Error: ${result.error}\n`);
    console.error(TranslationCli.buildHelpText());
    process.exit(2);
  }
  const options = result.options;
  if (options.help) {
    console.log(TranslationCli.buildHelpText());
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
    console.error(TranslationCli.buildHelpText());
    process.exit(2);
  }

  TranslationCli.loadEnvFiles();

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
      await CatalogTranslator.processLocale({
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
