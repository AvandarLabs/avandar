import { createContext } from "react";
import { defaultI18nMessages } from "@ui/i18n/i18nMessages";
import type { I18nMessages } from "@ui/i18n/i18nMessages";

/**
 * Carries the active translations to every AvaUI component.
 *
 * Lives apart from the provider and the hook that use it so that neither of
 * those files exports both a component and a non-component, which would cost
 * them React Fast Refresh.
 */
export const I18nMessagesContext =
  createContext<I18nMessages>(defaultI18nMessages);
