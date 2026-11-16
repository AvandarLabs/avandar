import { setupI18n } from "@lingui/core";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import type { Messages } from "@lingui/core";
import type { AvandarApi, PluginMessages } from "@plugin-sdk/PluginApi.types";

const FALLBACK_LOCALE = "en";

/**
 * Builds a record with no prototype, so a lookup of a key such as
 * `constructor` or `toString` finds nothing instead of a native member.
 */
function _createRecordWithoutPrototype<TValue>(
  entries: ReadonlyArray<readonly [string, TValue]>,
): Record<string, TValue> {
  const record: Record<string, TValue> = Object.create(null) as Record<
    string,
    TValue
  >;
  return Object.assign(record, Object.fromEntries(entries));
}

/** Lists the locales to read, from the lowest priority to the highest. */
function _buildCandidateLocales(locale: string): string[] {
  const baseLanguage = locale.split("-")[0] ?? locale;
  return [FALLBACK_LOCALE, baseLanguage, locale];
}

function _getOwnMessageEntries(options: {
  messages: PluginMessages;
  locale: string;
}): Array<[string, string]> {
  const { messages, locale } = options;
  if (!Object.hasOwn(messages, locale)) {
    return [];
  }
  return Object.entries(messages[locale] ?? {}).filter(
    (entry): entry is [string, string] => {
      return typeof entry[1] === "string";
    },
  );
}

/**
 * Merges the messages the locale can use. The exact locale wins over its base
 * language (`es` for `es-MX`), which wins over English.
 */
function _mergeMessagesForLocale(options: {
  messages: PluginMessages;
  locale: string;
}): Record<string, string> {
  const { messages, locale } = options;
  return _createRecordWithoutPrototype(
    _buildCandidateLocales(locale).flatMap((candidateLocale) => {
      return _getOwnMessageEntries({ messages, locale: candidateLocale });
    }),
  );
}

/**
 * Compiles each message once. Lingui logs a message it cannot compile and
 * compiles it to its own raw text, so a bad message stays readable.
 */
function _compileMessages(rawMessages: Record<string, string>): Messages {
  return _createRecordWithoutPrototype(
    Object.entries(rawMessages).map(([key, rawMessage]) => {
      return [key, compileMessage(rawMessage)] as const;
    }),
  );
}

/**
 * Makes a translator for a plugin's own messages, such as the one behind
 * `avandar.i18n.t` or the `useT` hook. Messages are ICU strings. A key missing
 * from the exact locale falls back to its base language (`es` for `es-MX`),
 * then to English, then to the bare key. A message that cannot be compiled or
 * formatted is returned as written instead of throwing.
 */
export function makePluginTranslator(
  options: Readonly<{ locale: string; messages: PluginMessages }>,
): AvandarApi["i18n"]["t"] {
  const { locale } = options;
  const rawMessages = _mergeMessagesForLocale(options);
  // Each translator owns its Lingui instance, so it never touches the
  // `i18n` singleton the host app uses for its own strings.
  const i18n = setupI18n();
  i18n.load(locale, _compileMessages(rawMessages));
  i18n.activate(locale);
  return (key, values) => {
    if (!Object.hasOwn(rawMessages, key)) {
      return key;
    }
    try {
      return i18n._(key, values);
    } catch {
      return rawMessages[key] ?? key;
    }
  };
}
