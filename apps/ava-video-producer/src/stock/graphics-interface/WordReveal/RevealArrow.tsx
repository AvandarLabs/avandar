import { SketchedShape } from "../../primitives/SketchedShape";
import { ARROW_AT } from "./WordReveal.constants";
import type { Drawing } from "./WordReveal.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the reveal arrow layer for WordReveal. */
export function RevealArrow(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.input.showArrow ? (
        <g
          opacity={props.motion.ramp(props.frame, ARROW_AT, props.motion.sheet)}
        >
          <SketchedShape
            shape={{ kind: "path", d: "M691 189 H827 V325 M826 189 L667 349" }}
            profile={props.sketch.shape}
            fill="none"
            stroke={props.accent}
            strokeWidth={props.shapes.stroke(props.stroke.emphasis)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={667} cy={349} r={5} fill={props.accent} />
          <SketchedShape
            shape={{ kind: "path", d: "M666 189 V136 M666 189 H613" }}
            profile={props.sketch.shape}
            stroke={props.color.line}
            strokeWidth={props.shapes.stroke(props.stroke.guide)}
          />
        </g>
      ) : null}
    </>
  );
}
