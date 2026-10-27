import { setupI18n } from "@lingui/core";
import { I18nProvider, LinguiContext } from "@lingui/react";
import { useContext } from "react";
import { continuityCatalogs } from "../catalogs.generated";
import type { ReactNode } from "react";

type Props = { children: ReactNode };

const ENGLISH_I18N = setupI18n({
  locale: "en",
  messages: { en: continuityCatalogs.en },
});

/** Provides standalone film copy while retaining an existing caller's locale. */
export function ContinuityI18nProvider({ children }: Props) {
  const existing = useContext(LinguiContext);
  if (existing?.i18n) {
    return children;
  }
  return <I18nProvider i18n={ENGLISH_I18N}>{children}</I18nProvider>;
}
