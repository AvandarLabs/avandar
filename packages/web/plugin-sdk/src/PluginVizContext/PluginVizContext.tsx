import { createContext, useContext, useMemo } from "react";
import type { AvandarApi } from "@plugin-sdk/PluginApi.types";
import type { ReactNode } from "react";

/** The chart type a component draws inside, and the plugin's translator. */
type PluginVizProviderValue = Readonly<{
  vizId: string;
  t: AvandarApi["i18n"]["t"];
}>;

type Props = {
  vizId: string;
  t: AvandarApi["i18n"]["t"];
  children: ReactNode;
};

const PluginVizProviderContext = createContext<
  PluginVizProviderValue | undefined
>(undefined);

/**
 * Marks its children as a plugin chart, so `useT` inside them returns the
 * chart's translator and `useAvandar` explains that a chart has no scoped
 * API. A host renders it around a plugin's chart component, for example in
 * a dashboard tile or on a public dashboard.
 */
export function PluginVizProvider({
  vizId,
  t,
  children,
}: Readonly<Props>): ReactNode {
  const value = useMemo(() => {
    return { vizId, t };
  }, [vizId, t]);
  return (
    <PluginVizProviderContext.Provider value={value}>
      {children}
    </PluginVizProviderContext.Provider>
  );
}

/**
 * The chart type id and translator of the nearest `PluginVizProvider`, or
 * undefined outside one. Read by `useT` and `useAvandar`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePluginVizContext(): PluginVizProviderValue | undefined {
  return useContext(PluginVizProviderContext);
}
