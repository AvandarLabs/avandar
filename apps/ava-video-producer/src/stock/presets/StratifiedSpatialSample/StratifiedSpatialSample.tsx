import { SampleCopy } from "./SampleCopy";
import { SampleSites } from "./SampleSites";
import { StratumFrame } from "./StratumFrame";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./StratifiedSpatialSample.schema";
import type { ReactNode } from "react";
/** Inputs for StratifiedSpatialSample. */
type Props = GraphicProps & { input: Input };

/** A retained eligible field divides into strata before selected sites rise. */
export function StratifiedSpatialSample({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <StratumFrame input={input} frame={frame} accent={accent} />
      <SampleSites input={input} frame={frame} accent={accent} />
      <SampleCopy input={input} frame={frame} />
    </g>
  );
}
