import { i18n } from "@lingui/core";
import { DEFAULT_LOCALE } from "./locales";
import type { SupportedLocale } from "./locales";

/**
 * Dynamically import a compiled catalog and activate it on the shared i18n
 * instance. Catalogs are produced by `pnpm i18n:compile` and emitted to
 * `src/i18n/locales/<locale>/messages.{ts,js}`.
 */
export async function activateLocale(locale: SupportedLocale): Promise<void> {
  const { messages } = await import(`./locales/${locale}/messages.ts`);
  i18n.loadAndActivate({ locale, messages });
}

/**
 * Initialise the shared i18n instance with the default locale. Call this once
 * at app startup before any UI that uses translations is rendered.
 */
export async function initI18n(
  initialLocale: SupportedLocale = DEFAULT_LOCALE,
): Promise<void> {
  await activateLocale(initialLocale);
}

export { i18n };
