import { Text } from "../../graphics-common/Text";
import { FILL_AT, HEADING_SIZE } from "./DotMatrix.constants";
import type { Drawing } from "./DotMatrix.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the cohort dots layer for DotMatrix. */
export function CohortDots(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Text role="title" x={64} y={118} size={HEADING_SIZE}>
        {props.input.heading}
      </Text>
      {props.cohort.dots.map((dot, index) => {
        const t = dot.selected
          ? props.motion.ramp(props.frame, FILL_AT + index, props.motion.chip)
          : 0;
        return (
          <g key={index}>
            <circle
              cx={dot.x}
              cy={dot.y}
              r={8}
              fill={props.color.inactive}
              fillOpacity={props.atomic.opacity["30"]}
            />
            {dot.selected ? (
              <circle
                cx={dot.x}
                cy={dot.y}
                r={8}
                fill={props.accent}
                opacity={t}
              />
            ) : null}
          </g>
        );
      })}
    </>
  );
}
