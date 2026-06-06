import { formatter } from "@lingui/format-po";
import type { LinguiConfig } from "@lingui/conf";

/**
 * Lingui configuration.
 *
 * To add a new language:
 * 1. Add the locale code below.
 * 2. Add a label + metadata entry in `src/i18n/locales.ts`.
 * 3. Run `pnpm i18n:extract` to scaffold the message catalog.
 * 4. Run `pnpm i18n:translate-llm` to generate translations via LLM.
 * 5. Run `pnpm i18n:compile` to compile the catalog into runtime JS.
 */
const config: LinguiConfig = {
  locales: ["en", "es", "pt", "fr", "sw", "ar", "zh-Hans", "zh-Hant"],
  sourceLocale: "en",
  fallbackLocales: {
    default: "en",
  },
  catalogs: [
    {
      path: "<rootDir>/src/i18n/locales/{locale}/messages",
      include: ["src", "shared", "packages/web"],
    },
  ],
  format: formatter({ lineNumbers: false }),
  compileNamespace: "ts",
  orderBy: "messageId",
};

export default config;
