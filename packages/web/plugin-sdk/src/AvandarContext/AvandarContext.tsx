import { PluginError } from "@plugin-sdk/PluginError/PluginError";
import { usePluginVizContext } from "@plugin-sdk/PluginVizContext/PluginVizContext";
import { createContext, useContext } from "react";
import type { AvandarApi } from "@plugin-sdk/PluginApi.types";
import type { ReactNode } from "react";

type Props = {
  api: AvandarApi;
  children: ReactNode;
};

const OUTSIDE_PLUGIN_UI_MESSAGE =
  "useAvandar() must be called inside plugin UI opened through avandar.ui";

const AvandarApiContext = createContext<AvandarApi | undefined>(undefined);

/**
 * Gives plugin UI access to its scoped `avandar` API. The host renders it
 * around the content of every modal or drawer a plugin opens.
 */
export function AvandarProvider({ api, children }: Readonly<Props>): ReactNode {
  return (
    <AvandarApiContext.Provider value={api}>
      {children}
    </AvandarApiContext.Provider>
  );
}

/**
 * The scoped `avandar` API, for components inside plugin UI. Throws a
 * `PluginError` when called outside an `AvandarProvider`. Inside a plugin
 * chart the error names the chart type, because charts get only `useT`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAvandar(): AvandarApi {
  const api = useContext(AvandarApiContext);
  const chart = usePluginVizContext();
  if (api !== undefined) {
    return api;
  }
  if (chart !== undefined) {
    throw new PluginError(
      "CommandFailed",
      `useAvandar() is not available inside the "${chart.vizId}" chart. Use useT() for strings.`,
    );
  }
  throw new PluginError("CommandFailed", OUTSIDE_PLUGIN_UI_MESSAGE);
}

/**
 * The plugin's translator, for components inside plugin UI or a plugin
 * chart. Throws a `PluginError` outside both an `AvandarProvider` and a
 * `PluginVizProvider`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useT(): AvandarApi["i18n"]["t"] {
  const api = useContext(AvandarApiContext);
  const chart = usePluginVizContext();
  if (api !== undefined) {
    return api.i18n.t;
  }
  if (chart !== undefined) {
    return chart.t;
  }
  throw new PluginError("CommandFailed", OUTSIDE_PLUGIN_UI_MESSAGE);
}
