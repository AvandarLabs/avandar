import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import { HEADING_SIZE } from "./LineTrace.constants";
import type { Drawing } from "./LineTrace.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the chart grid layer for LineTrace. */
export function ChartGrid(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Text role="title" x={64} y={111} size={HEADING_SIZE}>
        {props.input.heading}
      </Text>
      {[0, 25, 50, 75, 100].map((value) => {
        return (
          <g key={value}>
            <SketchedShape
              shape={{ kind: "path", d: `M121 ${458 - value * 3.1} H839` }}
              profile={props.sketch.shape}
              stroke={props.color.line}
              strokeOpacity={props.atomic.opacity["60"]}
              strokeWidth={props.shapes.stroke(props.stroke.hairline)}
            />
            <Text role="pill" x={99} y={463 - value * 3.1} anchor="end">
              {value}
            </Text>
          </g>
        );
      })}
    </>
  );
}
