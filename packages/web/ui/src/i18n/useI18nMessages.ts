import { useContext } from "react";
import { I18nMessagesContext } from "@ui/i18n/I18nMessagesContext";
import type { I18nMessages } from "@ui/i18n/i18nMessages";

/**
 * Returns the translated strings for AvaUI components, falling back to the
 * English defaults when no {@link I18nAvaUiProvider} is mounted.
 */
export function useI18nMessages(): I18nMessages {
  return useContext(I18nMessagesContext);
}
