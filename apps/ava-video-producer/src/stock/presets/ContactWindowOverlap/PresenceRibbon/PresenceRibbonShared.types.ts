import type { Input } from "../ContactWindowOverlap.schema";
/** Inputs shared by the PresenceRibbon visuals. */
export type Props = {
  record: Input["records"][number];
  index: number;
  frame: number;
  accent: string;
  input: Input;
};
