/** The `navigator` shape this module needs, without depending on DOM types. */
type LocaleAwareNavigator = { language?: string };

/**
 * The locale used to *read* calendar fields back out of `Intl`.
 *
 * This must stay a fixed Latin-digit, `GMT+HH:MM` locale. The numeric fields
 * recovered from it are parsed with `Number()`, and the zone offset is parsed
 * with a `GMT`-shaped regular expression, so formatting them in, say, `ar-EG`
 * (Arabic-Indic digits) or `fr-FR` (`UTC+2` offset labels) would silently
 * yield `NaN` calendar fields and a wrong offset. Only the month and weekday
 * *names* are locale-dependent output; everything else here is machinery.
 */
export const PARSE_LOCALE = "en-US";

/**
 * Resolves the locale used to *render* month and weekday names.
 *
 * Resolution order: an explicit `locale`, then the runtime's own preference
 * (`navigator.language` in a browser, or the host default in a Node process),
 * then {@link PARSE_LOCALE}. Callers should normally pass nothing, so a date
 * renders in the reader's own language rather than one chosen for them.
 */
export function getDisplayLocale(locale: string | undefined): string {
  if (locale) {
    return locale;
  }
  const runtimeNavigator = (globalThis as { navigator?: LocaleAwareNavigator })
    .navigator;
  if (runtimeNavigator?.language) {
    return runtimeNavigator.language;
  }
  try {
    return new Intl.DateTimeFormat().resolvedOptions().locale || PARSE_LOCALE;
  } catch {
    return PARSE_LOCALE;
  }
}
