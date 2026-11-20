import { interpolateFiniteRange } from "../../numeric/interpolateFiniteRange/interpolateFiniteRange";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ClassLegends } from "./ClassLegends";
import { ClassRuler } from "./ClassRuler";
import { ClassZone } from "./ClassZone";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ChoroplethClassBreaks.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
const SCENE_FADE_AT = 0;
const BREAK_AT = 51;
const BREAK_FRAMES = 59;
/** Moving authored thresholds recolor fixed schematic observations. */
export function ChoroplethClassBreaks({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const threshold = interpolateFiniteRange({
    from: input.schemes[0].breaks[1],
    to: input.schemes[1].breaks[1],
    progress: motion.ramp(
      frame,
      BREAK_AT,
      motion.scale(BREAK_FRAMES),
      motion.travel.easing,
    ),
  });
  return (
    <g opacity={motion.reveal(frame, SCENE_FADE_AT)}>
      <LabelSlots
        labels={[
          [input.copy.context, 48, 28, 864, 14, 1],
          [input.copy.before, 48, 72, 440, 14, 3],
          [input.copy.after, 542, 72, 370, 14, 3],
        ]}
      />
      {input.zones.map((zone, index) => {
        return (
          <ClassZone
            key={zone.id}
            {...{ zone, index, threshold, frame, accent }}
            noDataLabel={input.noDataLabel}
          />
        );
      })}
      <ClassLegends {...{ input, accent }} />
      <ClassRuler {...{ input, threshold }} />
    </g>
  );
}
