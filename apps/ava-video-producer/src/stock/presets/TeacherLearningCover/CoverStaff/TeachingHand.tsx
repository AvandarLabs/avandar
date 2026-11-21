import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useCoverStaffPresentation } from "./useCoverStaffPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useCoverStaffPresentation>,
  "role" | "handX" | "x" | "tokens" | "accent" | "scales"
>;
/** Render the teaching hand. */
export function TeachingHand(props: Readonly<Props>): ReactNode {
  return (
    <g data-teaching-hand={props.role}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M0 0 L${(props.handX - props.x) / 2} 25 L${props.handX - props.x} 50`,
        }}
        profile={props.tokens.sketch.shape}
        fill="none"
        stroke={
          props.role === "teacher" ? props.accent : props.tokens.color.highlight
        }
        strokeWidth={props.scales.stroke(props.tokens.stroke.emphasis)}
        strokeLinecap="round"
      />
    </g>
  );
}
