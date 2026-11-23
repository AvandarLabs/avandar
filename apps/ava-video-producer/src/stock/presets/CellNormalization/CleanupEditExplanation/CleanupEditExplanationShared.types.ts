import type { Input } from "../CellNormalization.schema";
/** Inputs shared by the CleanupEditExplanation visuals. */
export type Props = {
  row: Input["rows"][number];
  input: Input;
  frame: number;
};
