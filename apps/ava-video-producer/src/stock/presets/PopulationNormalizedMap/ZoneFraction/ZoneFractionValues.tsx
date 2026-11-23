import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useZoneFractionPresentation } from "./useZoneFractionPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useZoneFractionPresentation>,
  "zone" | "input" | "frame" | "tokens" | "motion" | "y"
>;
/** Render the zone fraction values. */
export function ZoneFractionValues(props: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={props.motion.ramp(
        props.frame,
        36,
        props.motion.scale(36),
        props.motion.reveal.easing,
      )}
    >
      {props.input.keepFractionsVisible || props.frame < 108 ? (
        <g>
          <LabelSlots
            labels={[
              [String(props.zone.records), 655, props.y + 37, 90, 14, 1],
            ]}
          />
          <SketchedShape
            shape={{
              kind: "line",
              x1: 640,
              y1: props.y + 42,
              x2: 735,
              y2: props.y + 42,
            }}
            profile={props.tokens.sketch.shape}
            stroke={props.tokens.color.inactive}
          />
        </g>
      ) : undefined}
      <LabelSlots
        labels={[[String(props.zone.population), 655, props.y + 60, 90, 14, 1]]}
      />
    </g>
  );
}
