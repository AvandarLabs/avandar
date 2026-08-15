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
 * Most callers should use the higher-level `pnpm translations`
 * orchestrator (extract → translate → compile). Run this script directly via
 * `pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts --help`
 * for scoped runs without re-extracting or recompiling.
 *
 * This entrypoint wires the pieces together and runs the CLI. The
 * implementation lives in cohesive sibling modules:
 *   - `poCatalog.ts`         PO parse / serialize / scope matching
 *   - `translationCli.ts`    CLI args, help text, env loading
 *   - `catalogTranslator.ts` OpenAI calls and per-locale processing
 *   - `main.ts`              CLI orchestration
 *   - `config.ts`            shared paths, defaults, locale metadata
 *
 * Env:
 *   OPENAI_API_KEY  required. Loaded from .env.development (and, as a
 *                   fallback for compatibility with the Supabase edge
 *                   convention, .env.development.edge).
 *   I18N_LLM_MODEL  optional. Defaults to `gpt-4o-mini`.
 */

import process from "node:process";
import { main } from "./main";

export { CatalogTranslator } from "./catalogTranslator";
export { PoCatalog } from "./poCatalog";
export type { ParsedPo, PoEntry } from "./poCatalog";
export { TranslationCli } from "./translationCli";
export type { CliOptions, ParseArgsResult } from "./translationCli";

// Skip the auto-run when imported under Vitest (so tests can pull in the
// pure helpers without spinning up the CLI). Vitest sets `VITEST=true`
// for every worker.
if (!process.env.VITEST) {
  void main();
}
