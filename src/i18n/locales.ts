/**
 * Locale metadata. The set of locale codes here must stay in sync with
 * `lingui.config.ts`. To add a new locale, append it to both files and
 * re-run `pnpm i18n:extract`.
 */

export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "pt",
  "fr",
  "sw",
  "ar",
  "zh-Hans",
  "zh-Hant",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

type LocaleMeta = {
  /** Native-language name shown in the language picker. */
  label: string;
  /** English name (for fallback / a11y). */
  englishName: string;
  /** Text direction. */
  direction: "ltr" | "rtl";
};

export const LOCALE_META: Record<SupportedLocale, LocaleMeta> = {
  en: { label: "English", englishName: "English", direction: "ltr" },
  es: { label: "Español", englishName: "Spanish", direction: "ltr" },
  pt: { label: "Português", englishName: "Portuguese", direction: "ltr" },
  fr: { label: "Français", englishName: "French", direction: "ltr" },
  sw: { label: "Kiswahili", englishName: "Swahili", direction: "ltr" },
  ar: { label: "العربية", englishName: "Arabic", direction: "rtl" },
  "zh-Hans": {
    label: "简体中文",
    englishName: "Chinese (Simplified)",
    direction: "ltr",
  },
  "zh-Hant": {
    label: "繁體中文",
    englishName: "Chinese (Traditional)",
    direction: "ltr",
  },
};

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function getLocaleDirection(locale: SupportedLocale): "ltr" | "rtl" {
  return LOCALE_META[locale].direction;
}
