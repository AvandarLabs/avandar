import type { Input } from "../StratifiedSpatialSample.schema";
/** Inputs shared by the StratumBoundary visuals. */
export type Props = {
  stratum: Input["strata"][number];
  index: number;
  frame: number;
  color: string;
};
