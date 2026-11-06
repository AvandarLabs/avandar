import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatter } from "@lingui/format-po";
import type { LinguiConfig } from "@lingui/conf";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const LOCALES = fs
  .readdirSync(path.join(ROOT, "src/continuity/i18n/locales"), {
    withFileTypes: true,
  })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const FALLBACKS = Object.fromEntries(
  LOCALES.filter((locale) => locale !== "en").map((locale) => [
    locale,
    [locale.split(/[-_]/)[0], "en"].filter(
      (language) => language !== locale && LOCALES.includes(language),
    ),
  ]),
);

/** Extracts generated continuity descriptors into independently editable locales. */
const config: LinguiConfig = {
  rootDir: ROOT,
  locales: LOCALES,
  sourceLocale: "en",
  fallbackLocales: { default: "en", ...FALLBACKS },
  catalogs: [
    {
      path: "<rootDir>/src/continuity/i18n/locales/{locale}/messages",
      include: ["src/continuity/i18n/descriptors.generated.ts"],
    },
  ],
  format: formatter({ lineNumbers: false }),
  compileNamespace: "ts",
  orderBy: "messageId",
};
export default config;
