import { ramp, EASE } from "../../../motion";
import { interpolateFiniteRange } from "../../numeric/interpolateFiniteRange/interpolateFiniteRange";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ClassLegends } from "./ClassLegends";
import { ClassRuler } from "./ClassRuler";
import { ClassZone } from "./ClassZone";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ChoroplethClassBreaks.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/** Moving authored thresholds recolor fixed schematic observations. */
export function ChoroplethClassBreaks({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const threshold = interpolateFiniteRange({
    from: input.schemes[0].breaks[1],
    to: input.schemes[1].breaks[1],
    progress: ramp(frame, 51, 59, EASE.inOut),
  });
  return (
    <g opacity={ramp(frame, 0, 12)}>
      <LabelSlots
        labels={[
          [input.copy.context, 48, 28, 864, 14, 1],
          [input.copy.before, 48, 72, 440, 14, 3],
          [input.copy.after, 542, 72, 370, 14, 3],
        ]}
      />
      {input.zones.map((zone, index) => (
        <ClassZone
          key={zone.id}
          {...{ zone, index, threshold, frame, accent }}
          noDataLabel={input.noDataLabel}
        />
      ))}
      <ClassLegends {...{ input, accent }} />
      <ClassRuler {...{ input, threshold }} />
    </g>
  );
}
