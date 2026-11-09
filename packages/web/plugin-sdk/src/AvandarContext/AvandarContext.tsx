import { PluginError } from "@plugin-sdk/PluginError/PluginError";
import { createContext, useContext } from "react";
import type { AvandarApi } from "@plugin-sdk/PluginApi.types";
import type { ReactNode } from "react";

type Props = {
  api: AvandarApi;
  children: ReactNode;
};

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
 * `PluginError` when called outside an `AvandarProvider`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAvandar(): AvandarApi {
  const api = useContext(AvandarApiContext);
  if (api === undefined) {
    throw new PluginError(
      "CommandFailed",
      "useAvandar() must be called inside plugin UI opened through avandar.ui",
    );
  }
  return api;
}

/** The plugin's translator, for components inside plugin UI. */
// eslint-disable-next-line react-refresh/only-export-components
export function useT(): AvandarApi["i18n"]["t"] {
  return useAvandar().i18n.t;
}
