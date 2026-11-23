import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useMeasuringToolsPresentation } from "./useMeasuringToolsPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useMeasuringToolsPresentation>,
  "x" | "origin" | "rulerY" | "accent" | "tokens" | "scales"
>;
/** Render the ruler hand. */
export function RulerHand(props: Readonly<Props>): ReactNode {
  return (
    <g data-ruler-hand="true">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${props.x - 8} 235 L${props.origin - 10} ${props.rulerY + 12}`,
        }}
        profile={props.tokens.sketch.shape}
        fill="none"
        stroke={props.accent}
        strokeWidth={props.scales.stroke(props.tokens.stroke.emphasis)}
      />
    </g>
  );
}
