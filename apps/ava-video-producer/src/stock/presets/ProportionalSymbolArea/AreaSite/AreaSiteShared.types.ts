import type { Input } from "../ProportionalSymbolArea.schema";
/** Inputs shared by the AreaSite visuals. */
export type Props = {
  site: Input["sites"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
