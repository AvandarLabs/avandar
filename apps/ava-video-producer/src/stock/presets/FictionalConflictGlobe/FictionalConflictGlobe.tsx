import { EASE, mix, ramp } from "../../../motion";
import { GlobeCopy } from "./GlobeCopy";
import { GlobeIncident } from "./GlobeIncident";
import { GlobeSurface } from "./GlobeSurface";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./FictionalConflictGlobe.schema";
import type { ReactNode } from "react";
/** Hypothetical surface locations and an authored shortest longitude sweep. */
export type Props = GraphicProps & { input: Input };
/** Real land provides orientation while fictional incidents retain identity. */
export function FictionalConflictGlobe({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const sweep =
    ((input.longitudeSweep.end - input.longitudeSweep.start + 540) % 360) - 180;
  const longitude = mix(
    ramp(frame, 24, 84, EASE.inOut),
    input.longitudeSweep.start,
    input.longitudeSweep.start + sweep,
  );
  return (
    <g
      opacity={ramp(frame, 12, 18)}
      data-total-incidents={input.incidents.length}
    >
      <GlobeCopy input={input} />
      <GlobeSurface longitude={longitude} showGraticule={input.showGraticule} />
      {input.incidents.map((incident, index) => (
        <GlobeIncident
          key={incident.id}
          incident={incident}
          incidents={input.incidents}
          index={index}
          longitude={longitude}
          showLabel={input.showLabels}
          accent={accent}
        />
      ))}
    </g>
  );
}
