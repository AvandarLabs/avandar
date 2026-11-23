import { Text } from "../../graphics-common/Text";
import { STATE_SIZE } from "./StatusCycle.constants";
import type { Drawing } from "./StatusCycle.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the active state labels layer for StatusCycle. */
export function ActiveStateLabels(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.states.map((state, i) => {
        const opacity =
          props.motion.ramp(props.frame, state.at, props.motion.chip) *
          (i < props.states.length - 1
            ? 1 -
              props.motion.ramp(
                props.frame,
                props.states[i + 1].at,
                props.motion.chip,
              )
            : 1);
        return (
          <g key={state.label} opacity={opacity}>
            <Text
              role="title"
              x={338}
              y={277}
              size={STATE_SIZE}
              fill={
                i === props.states.length - 1 ? props.accent : props.color.text
              }
            >
              {state.label}
            </Text>
            <Text role="label" x={338} y={310} fill={props.color.textMuted}>
              {state.detail}
            </Text>
          </g>
        );
      })}
    </>
  );
}
