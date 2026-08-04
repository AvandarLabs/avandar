import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Shared paths, defaults, and locale metadata for the LLM translation script.
 *
 * `PROJECT_ROOT` is resolved relative to this module's own location, so this
 * file must stay in the `scripts/i18n/translateWithLlm/` directory alongside
 * its siblings for the path math to hold.
 */
export const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
export const LOCALES_DIR = path.join(PROJECT_ROOT, "src", "i18n", "locales");
export const SOURCE_LOCALE = "en";
export const DEFAULT_MODEL = "gpt-5.6-luna";
export const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

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
