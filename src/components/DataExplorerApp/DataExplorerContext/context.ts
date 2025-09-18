import { createContext } from "react";
import type { DataExplorerContextType } from "./types";

export const DataExplorerContext =
  createContext<DataExplorerContextType | null>(null);
