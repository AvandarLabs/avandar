import { setupI18n } from "@lingui/core";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import type {
  PluginMessages,
  TranslationValues,
} from "@plugin-sdk/PluginApi.types";

/**
 * Makes a translator for a plugin's own messages, such as the one behind
 * `avandar.i18n.t` or the `useT` hook. Messages are ICU strings compiled at
 * runtime. A key missing from `locale` falls back to English, then to the
 * bare key.
 */
export function makePluginTranslator(options: {
  locale: string;
  messages: PluginMessages;
}): (key: string, values?: TranslationValues) => string {
  const { locale, messages } = options;
  const i18n = setupI18n();
  i18n.setMessagesCompiler(compileMessage);
  i18n.load(locale, { ...messages.en, ...messages[locale] });
  i18n.activate(locale);
  return (key, values) => {
    return i18n._(key, values);
  };
}
