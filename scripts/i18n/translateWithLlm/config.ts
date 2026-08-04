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

/**
 * Reasoning effort for the translation calls. `"low"` is a deliberate middle
 * ground: `"medium"` (the gpt-5.x default) over-reasons for short-string
 * translation, but `"none"` is a bit too aggressive here because these prompts
 * are not pure transduction. Each batched call must preserve ICU placeholders
 * (`{name}`, `{count}`) verbatim, avoid translating variable names, pick the
 * right per-locale register, and return well-formed JSON for every key. `"low"`
 * keeps it cheap and fast while leaving a small safety margin for those
 * constraints on the trickier locales.
 */
export const DEFAULT_REASONING_EFFORT = "low";
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
