import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  SPINNER_PERIOD,
  SPINNER_DASH,
  SPINNER_STROKE,
} from "./StatusCycle.constants";
import type { Drawing } from "./StatusCycle.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the processing spinner layer for StatusCycle. */
export function ProcessingSpinner(props: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{ kind: "circle", cx: 267, cy: 281, r: 30 }}
        profile={props.sketch.shape}
        fill="none"
        stroke={props.accent}
        strokeOpacity={props.processing * props.atomic.opacity["18"]}
        strokeWidth={props.shapes.stroke(props.stroke.default)}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: 267, cy: 281, r: 30 }}
        profile={props.sketch.shape}
        fill="none"
        stroke={props.accent}
        strokeWidth={props.shapes.stroke(SPINNER_STROKE)}
        pathLength={1}
        strokeDasharray={SPINNER_DASH}
        strokeDashoffset={
          -Motion.loopPhase({
            frame: props.frame,
            period: SPINNER_PERIOD,
          })
        }
        opacity={props.processing}
      />
    </>
  );
}
