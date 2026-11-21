import { SketchedShape } from "../../../primitives/SketchedShape";
import type { usePipelineStripPresentation } from "./usePipelineStripPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof usePipelineStripPresentation>,
  "originalSteps" | "tokens" | "scales" | "fade"
>;
/** Render the original pipeline joints. */
export function OriginalPipelineJoints(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.originalSteps.slice(1).map((step, index) => {
        return (
          <g key={step.id} data-original-join={step.id}>
            <SketchedShape
              shape={{
                kind: "line",
                x1: props.originalSteps[index].x + 140,
                y1: 345,
                x2: step.x,
                y2: 345,
              }}
              profile={props.tokens.sketch.shape}
              stroke={props.tokens.color.inactive}
              strokeWidth={props.scales.stroke(props.tokens.stroke.default)}
              opacity={1 - props.fade}
            />
          </g>
        );
      })}
    </>
  );
}
