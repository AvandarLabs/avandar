import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Theme, cssVariablesResolver } from "@/config/Theme/Theme";
import { ProductThemeRoot } from "../ProductThemeRoot/ProductThemeRoot";
import { VideoRouteContext } from "../shims/VideoRouteContext";
import type { ReactNode } from "react";

type Props = { route: string; children: ReactNode };
/** Supply product translation, theme and fixture routing to the stage. */
export function AvandarStageProviders({
  route,
  children,
}: Readonly<Props>): ReactNode {
  return (
    <I18nProvider i18n={i18n}>
      <ProductThemeRoot
        theme={{
          ...Theme,
          fontFamily: "Figtree Variable, Figtree, sans-serif",
        }}
        cssVariablesResolver={cssVariablesResolver}
        forceColorScheme="light"
      >
        <VideoRouteContext.Provider value={route}>
          {children}
        </VideoRouteContext.Provider>
      </ProductThemeRoot>
    </I18nProvider>
  );
}
