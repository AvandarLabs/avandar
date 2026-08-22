import type { ReactNode } from "react";

import { I18nProvider } from "@lingui/react";

import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { i18n } from "@/i18n/i18n";

type Props = {
  children: ReactNode;
};

/**
 * Wraps test renders with every context provider a component might pull
 * from in production:
 * - `I18nProvider` so any `<Trans>` / `useLingui()` resolves without
 *   throwing "rendered without I18nProvider"
 * - `AvandarAppProvider` (Mantine theme, modals, notifications)
 *
 * `I18nProvider` is mounted *outside* `AvandarAppProvider` to mirror the real
 * app tree (`AvandarI18nProvider` wraps `AvandarAppProvider`). This ordering
 * matters because `AvandarAppProvider` owns the `ModalsProvider`: imperatively
 * opened modals (e.g. the app-wide dropzone confirm dialog) must render inside
 * the Lingui context so their `<Trans>` content resolves.
 *
 * The Lingui catalog is activated in `tests/vitest.setup.ts`, so messages
 * resolve to their source string when no translation is loaded.
 */
export function TestProviders({ children }: Props): JSX.Element {
  return (
    <I18nProvider i18n={i18n}>
      <AvandarAppProvider>{children}</AvandarAppProvider>
    </I18nProvider>
  );
}
