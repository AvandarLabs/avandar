import { PopulationLegend } from "./PopulationLegend";
import { ZoneFractions } from "./ZoneFractions";
import { ZoneLids } from "./ZoneLids";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PopulationNormalizedMap.schema";
import type { ReactNode } from "react";
/** Inputs for PopulationNormalizedMap. */
type Props = GraphicProps & { input: Input };

/** Zone lids reveal immutable denominators before settling with rate shades. */
export function PopulationNormalizedMap({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ZoneLids input={input} frame={frame} accent={accent} />
      <ZoneFractions input={input} frame={frame} accent={accent} />
      <PopulationLegend input={input} frame={frame} accent={accent} />
    </g>
  );
}
