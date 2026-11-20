import { mix } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { GlobeCopy } from "./GlobeCopy";
import { GlobeIncident } from "./GlobeIncident";
import { GlobeSurface } from "./GlobeSurface/GlobeSurface";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  const sweep =
    ((input.longitudeSweep.end - input.longitudeSweep.start + 540) % 360) - 180;
  const longitude = mix(
    motion.ramp(frame, 24, motion.scale(84), motion.travel.easing),
    input.longitudeSweep.start,
    input.longitudeSweep.start + sweep,
  );
  return (
    <g
      opacity={motion.ramp(frame, 12, motion.hero)}
      data-total-incidents={input.incidents.length}
    >
      <GlobeCopy input={input} />
      <GlobeSurface longitude={longitude} showGraticule={input.showGraticule} />
      {input.incidents.map((incident, index) => {
        return (
          <GlobeIncident
            key={incident.id}
            incident={incident}
            incidents={input.incidents}
            index={index}
            longitude={longitude}
            showLabel={input.showLabels}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
