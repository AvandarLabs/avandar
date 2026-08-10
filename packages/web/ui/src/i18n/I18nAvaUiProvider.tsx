import { createContext, useContext, useMemo } from "react";
import {
  defaultI18nMessages,
  type I18nMessages,
} from "@ui/i18n/i18nMessages";
import type { ReactElement, ReactNode } from "react";

const I18nMessagesContext = createContext<I18nMessages>(defaultI18nMessages);

/**
 * Supplies translated strings to AvaUI components.
 *
 * Most apps mount {@link AvaUiProvider} instead, which includes this. Reach for
 * this directly only when the app owns its own Mantine setup and wants nothing
 * from AvaUI but the translations.
 *
 * Mounting it at all is optional. Without it, components fall back to
 * `defaultI18nMessages` (English), so the package works with no setup.
 *
 * ```tsx
 * <I18nAvaUiProvider i18nMessages={{ cancel: t`Cancel`, save: t`Save` }}>
 *   <App />
 * </I18nAvaUiProvider>
 * ```
 *
 * @param props.i18nMessages Translated strings. Partial: any key you leave out
 *   falls back to the English default, so you can translate incrementally.
 */
export function I18nAvaUiProvider(props: {
  children: ReactNode;
  i18nMessages?: Partial<I18nMessages>;
}): ReactElement {
  const { children, i18nMessages } = props;

  const messages = useMemo(() => {
    return i18nMessages ?
        { ...defaultI18nMessages, ...i18nMessages }
      : defaultI18nMessages;
  }, [i18nMessages]);

  return (
    <I18nMessagesContext.Provider value={messages}>
      {children}
    </I18nMessagesContext.Provider>
  );
}

/**
 * Returns the translated strings for `@avandar/ui` components, falling back to
 * the English defaults when no `I18nAvaUiProvider` is mounted.
 */
export function useI18nMessages(): I18nMessages {
  return useContext(I18nMessagesContext);
}
