import { Check } from "../../graphics-common/Check";
import type { Drawing } from "./StatusCycle.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the status completion layer for StatusCycle. */
export function StatusCompletion(props: Readonly<Props>): ReactNode {
  return (
    <>
      <circle
        cx={267}
        cy={281}
        r={7}
        fill={props.color.inactive}
        opacity={
          1 -
          props.motion.ramp(props.frame, props.states[1].at, props.motion.chip)
        }
      />
      <g opacity={props.complete}>
        <Check x={267} y={281} size={30} color={props.accent} />
      </g>
    </>
  );
}
