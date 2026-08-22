import type { ReactNode } from "react";

import { I18nProvider } from "@lingui/react";
import { useEffect, useState } from "react";

import { activateLocale, i18n } from "./i18n";
import { DEFAULT_LOCALE } from "./locales";

type Props = {
  children: ReactNode;
};

/**
 * Provides Lingui for routes outside a workspace (sign-in, register, etc.).
 * Workspace routes additionally mount `WorkspaceI18nProvider` for per-workspace
 * locale and RTL.
 */
export function AppI18nProvider({ children }: Props): ReactNode {
  const [isReady, setIsReady] = useState(false);

  useEffect(function activateDefaultLocale() {
    let cancelled = false;
    void activateLocale(DEFAULT_LOCALE).then(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return null;
  }

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
