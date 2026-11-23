import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useMeasuringToolsPresentation } from "./useMeasuringToolsPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useMeasuringToolsPresentation>,
  "x" | "pencilX" | "rulerY" | "tokens" | "accent" | "scales"
>;
/** Render the pencil hand. */
export function PencilHand(props: Readonly<Props>): ReactNode {
  return (
    <g data-pencil-hand="true">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${props.x + 8} 235 L${props.pencilX + 5} ${props.rulerY - 14}`,
        }}
        profile={props.tokens.sketch.shape}
        fill="none"
        stroke={props.accent}
        strokeWidth={props.scales.stroke(props.tokens.stroke.emphasis)}
      />
    </g>
  );
}
