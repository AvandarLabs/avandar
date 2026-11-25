import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import type { Drawing } from "./StatusCycle.types";
import type { ReactNode } from "react";

type Props = Drawing & { state: Drawing["states"][number]; stateIndex: number };

/** Renders the state timeline marker layer for StatusCycle. */
export function StateTimelineMarker(props: Readonly<Props>): ReactNode {
  return (
    <g key={props.state.label}>
      <circle
        cx={252 + props.stateIndex * 230}
        cy={511}
        r={4}
        fill={props.accent}
        fillOpacity={
          props.atomic.opacity["20"] +
          props.motion.ramp(props.frame, props.state.at, props.motion.chip) *
            props.atomic.opacity["80"]
        }
      />
      <Text role="secondary" x={268 + props.stateIndex * 230} y={516}>
        {props.state.label}
      </Text>
      {props.stateIndex < props.states.length - 1 ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${352 + props.stateIndex * 230} 511 h90`,
          }}
          profile={props.sketch.shape}
          stroke={props.color.line}
          strokeWidth={props.shapes.stroke(props.stroke.hairline)}
        />
      ) : null}
    </g>
  );
}
