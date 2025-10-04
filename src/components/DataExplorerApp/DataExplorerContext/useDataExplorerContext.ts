import { useContext } from "react";
import { DataExplorerContext } from "./context";
import type { DataExplorerContextType } from "./types";

export function useDataExplorerContext(): DataExplorerContextType {
  const ctx = useContext(DataExplorerContext);
  if (ctx === null) {
    throw new Error(
      "useDataExplorerContext must be used within a <DataExplorerProvider>.",
    );
  }
  return ctx;
}
