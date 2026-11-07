/** Locale code to message key to text, as loaded from `locales/<lang>.json`. */
export type PluginLocaleMessages = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;

/**
 * Matches a whole `%key%` reference and captures the key. The one definition
 * of what a localized manifest string looks like, shared by the schema and
 * the string lookups.
 */
export const LOCALIZED_KEY_PATTERN = /^%([A-Za-z0-9_.-]+)%$/;

const FALLBACK_LOCALE = "en";

function _getOwnMessage(options: {
  strings: PluginLocaleMessages;
  locale: string;
  key: string;
}): string | undefined {
  const { strings, locale, key } = options;
  if (!Object.hasOwn(strings, locale)) {
    return undefined;
  }
  const messages = strings[locale];
  if (messages === undefined || !Object.hasOwn(messages, key)) {
    return undefined;
  }
  const message: unknown = messages[key];
  return typeof message === "string" ? message : undefined;
}

function _buildLocaleFallbackChain(locale: string): string[] {
  const baseLanguage = locale.split("-")[0] ?? locale;
  return [locale, baseLanguage, FALLBACK_LOCALE];
}

/**
 * Gets the message key out of a `%key%` reference, so callers can tell which
 * locale entry a manifest string points at. Returns undefined for plain text.
 */
export function getMessageKeyFromManifestString(
  value: string,
): string | undefined {
  return LOCALIZED_KEY_PATTERN.exec(value)?.[1];
}

/**
 * Gets the text to display for a manifest string, such as a plugin name or a
 * command title. A `%key%` reference is looked up in the exact locale, then
 * its base language (`zh-Hans` to `zh`), then English, and falls back to the
 * bare key. Plain text is returned unchanged.
 */
export function getLocalizedTextFromManifestStrings(options: {
  strings: PluginLocaleMessages;
  locale: string;
  value: string;
}): string {
  const { strings, locale, value } = options;
  const key = getMessageKeyFromManifestString(value);
  if (key === undefined) {
    return value;
  }
  const message = _buildLocaleFallbackChain(locale)
    .map((candidateLocale) => {
      return _getOwnMessage({ strings, locale: candidateLocale, key });
    })
    .find((candidateMessage) => {
      return candidateMessage !== undefined;
    });
  return message ?? key;
}
