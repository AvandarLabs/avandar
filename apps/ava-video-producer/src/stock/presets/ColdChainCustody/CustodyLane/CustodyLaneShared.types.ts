import type { Input } from "../ColdChainCustody.schema";
/** Inputs shared by the CustodyLane visuals. */
export type Props = {
  crate: Input["crates"][number];
  index: number;
  frame: number;
  accent: string;
  input: Input;
};
