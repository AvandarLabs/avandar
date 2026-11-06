import { ObservationCaptions } from "./ObservationCaptions";
import { ObservationContext } from "./ObservationContext";
import { ObservationFieldTeam } from "./ObservationFieldTeam";
import { ObservationTile } from "./ObservationTile";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";
/** Inputs for EnvironmentalObservationGaps. */
type Props = GraphicProps & { input: Input };

/** Cell-area gaps persist beneath separately placed point observations. */
export function EnvironmentalObservationGaps({
  frame,
  accent,
  id,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ObservationContext input={input} />
      <ObservationTile frame={frame} accent={accent} id={id} input={input} />
      <ObservationFieldTeam frame={frame} input={input} />
      <ObservationCaptions input={input} />
    </g>
  );
}
