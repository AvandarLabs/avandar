import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import type { PluginLocaleMessages } from "@avandar/plugin-manifest/runtime";

/**
 * A function that turns a plugin's `%key%` manifest strings into the reader's
 * language, using the plugin's own locale files. Use it wherever settings
 * show a plugin's strings, such as a data slot's title in the install
 * wizard or a content item's title on the plugin's card.
 */
export function useLocalizePluginText(
  strings: PluginLocaleMessages,
): (value: string) => string {
  const { i18n } = useLingui();
  return (value) => {
    return getLocalizedTextFromManifestStrings({
      strings,
      locale: i18n.locale,
      value,
    });
  };
}
