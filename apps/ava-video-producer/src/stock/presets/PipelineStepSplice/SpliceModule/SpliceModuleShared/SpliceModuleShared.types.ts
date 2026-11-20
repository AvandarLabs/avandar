import type { getSpliceGeometryFromInputAndFrame } from "../../getSpliceGeometryFromInputAndFrame";
/** Inputs shared by the SpliceModule visuals. */
export type Props = {
  step: ReturnType<typeof getSpliceGeometryFromInputAndFrame>[number];
  index: number;
  frame: number;
  accent: string;
};
