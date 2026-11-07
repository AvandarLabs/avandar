/** Locale code to message key to text, as loaded from `locales/<lang>.json`. */
export type PluginLocaleMessages = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;

const LOCALIZED_KEY_PATTERN = /^%([A-Za-z0-9_.-]+)%$/;

/** The message key in a `%key%` reference, or undefined for plain text. */
export function getLocalizedKey(value: string): string | undefined {
  return LOCALIZED_KEY_PATTERN.exec(value)?.[1];
}

/**
 * Resolves a manifest string. `%key%` references resolve in `locale`, then
 * English, then fall back to the bare key. Plain text is returned unchanged.
 */
export function resolveManifestString(options: {
  strings: PluginLocaleMessages;
  locale: string;
  value: string;
}): string {
  const { strings, locale, value } = options;
  const key = getLocalizedKey(value);
  if (key === undefined) {
    return value;
  }
  return strings[locale]?.[key] ?? strings.en?.[key] ?? key;
}
