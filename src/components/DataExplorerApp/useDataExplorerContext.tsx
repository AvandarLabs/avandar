import { useContext } from "react";
import {
  DataExplorerContext,
  DataExplorerContextType,
} from "./DataExplorerContext";

export function useDataExplorerContext(): DataExplorerContextType {
  const ctx = useContext(DataExplorerContext);
  if (ctx === null) {
    throw new Error(
      "useDataExplorerContext must be used within a <DataExplorerProvider>.",
    );
  }
  return ctx;
}
