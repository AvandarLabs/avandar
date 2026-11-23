import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useRecognitionExchangePresentation } from "./useRecognitionExchangePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useRecognitionExchangePresentation>,
  | "frame"
  | "accent"
  | "focusedX"
  | "atomic"
  | "tokens"
  | "motion"
  | "acknowledge"
>;
/** Render the acknowledgment anchor. */
export function AcknowledgmentAnchor(props: Readonly<Props>): ReactNode {
  return (
    <g data-acknowledgment-anchor="true">
      <SketchedShape
        shape={{
          kind: "line",
          x1: props.focusedX + 80,
          y1: 330,
          x2: 165,
          y2: 340,
        }}
        profile={props.tokens.sketch.shape}
        opacity={
          Motion.ramp({
            frame: props.frame,
            at: 67,
            dur: props.acknowledge,
            easing: props.motion.reveal.easing,
          }) * props.atomic.opacity["60"]
        }
        stroke={props.accent}
        strokeDasharray={props.atomic.dash.spaced.join(" ")}
      />
    </g>
  );
}
