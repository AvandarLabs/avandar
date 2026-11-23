import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useAreaLegendPresentation } from "./useAreaLegendPresentation";
import type { ReactNode } from "react";

const COMPARISON_AT = 111;
const COMPARISON_FRAMES = 28;
type Props = Pick<
  ReturnType<typeof useAreaLegendPresentation>,
  "frame" | "accent" | "sketch" | "motion" | "hairline" | "ratio" | "radius"
>;
/** Render the area reference comparison. */
export function AreaReferenceComparison(props: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={props.motion.ramp(
        props.frame,
        COMPARISON_AT,
        props.motion.scale(COMPARISON_FRAMES),
      )}
    >
      <SketchedShape
        data-reference-radius="true"
        shape={{ kind: "path", d: `M546 466 h${props.radius}` }}
        profile={props.sketch.shape}
        stroke={props.accent}
        strokeWidth={props.hairline}
      />
      <LabelSlots
        labels={[
          [
            `A₂/A₁ = ${props.ratio} · r₂/r₁ = ${Math.sqrt(props.ratio)}`,
            516,
            526,
            396,
            12,
            3,
          ],
        ]}
      />
    </g>
  );
}
