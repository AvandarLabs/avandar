import type { SupportedLocale } from "./locales";
import type { ReactNode } from "react";

import { I18nProvider } from "@lingui/react";
import { DirectionProvider } from "@mantine/core";
import { useEffect, useState } from "react";

import { activateLocale, i18n } from "./i18n";
import { DEFAULT_LOCALE, getLocaleDirection } from "./locales";

type Props = {
  locale: SupportedLocale;
  children: ReactNode;
};

/**
 * Loads the compiled catalog for `locale`, activates it on the shared `i18n`
 * instance, and applies the matching text direction via Mantine's
 * `DirectionProvider` (so RTL locales like Arabic render correctly).
 *
 * While the initial catalog is loading we render nothing: switching is fast
 * once a catalog has been resolved, since browser/V8 caches the dynamic
 * import.
 */
export function WorkspaceI18nProvider({ locale, children }: Props): ReactNode {
  const [activeLocale, setActiveLocale] = useState<SupportedLocale | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const activateRequestedLocale = async () => {
      try {
        await activateLocale(locale);
      } catch {
        if (locale !== DEFAULT_LOCALE) {
          await activateLocale(DEFAULT_LOCALE);
        }
      }
      if (!cancelled) {
        setActiveLocale(locale);
      }
      // Mantine reads direction from <html dir>, mirror it so global
      // chrome (scrollbars, native form widgets) also flips for RTL.
      if (typeof document !== "undefined") {
        document.documentElement.dir = getLocaleDirection(locale);
        document.documentElement.lang = locale;
      }
    };
    void activateRequestedLocale();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!activeLocale) {
    return null;
  }

  // Key on the locale so DirectionProvider remounts when switching between
  // LTR and RTL locales, picking up the freshly set `<html dir>`.
  return (
    <DirectionProvider
      key={activeLocale}
      initialDirection={getLocaleDirection(activeLocale)}
    >
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </DirectionProvider>
  );
}
