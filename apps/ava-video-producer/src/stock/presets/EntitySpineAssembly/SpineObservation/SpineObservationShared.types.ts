import type { Input } from "../EntitySpineAssembly.schema";
/** Inputs shared by the SpineObservation visuals. */
export type Props = {
  input: Input;
  observation: Input["observations"][number];
  index: number;
  frame: number;
  accent: string;
};
