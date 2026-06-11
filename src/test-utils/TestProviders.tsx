import { I18nProvider } from "@lingui/react";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { i18n } from "@/i18n/i18n";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Wraps test renders with every context provider a component might pull
 * from in production:
 * - `AvandarUiProvider` (Mantine theme, modals, notifications)
 * - `I18nProvider` so any `<Trans>` / `useLingui()` resolves without
 *   throwing "rendered without I18nProvider"
 *
 * The Lingui catalog is activated in `tests/vitest.setup.ts`, so messages
 * resolve to their source string when no translation is loaded.
 */
export function TestProviders({ children }: Props): JSX.Element {
  return (
    <AvandarUiProvider>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </AvandarUiProvider>
  );
}
