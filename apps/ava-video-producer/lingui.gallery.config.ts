import { formatter } from "@lingui/format-po";
import type { LinguiConfig } from "@lingui/conf";

/** Gallery UI copy stays separate from the product application's catalogs. */
const config: LinguiConfig = {
  locales: ["en"],
  sourceLocale: "en",
  fallbackLocales: {
    default: "en",
  },
  catalogs: [
    {
      path: "<rootDir>/src/gallery/locales/{locale}/messages",
      include: ["src/gallery", "src/continuity/gallery"],
      exclude: ["**/*.test.*"],
    },
  ],
  format: formatter({
    lineNumbers: false,
  }),
  compileNamespace: "ts",
  orderBy: "messageId",
};
export default config;
