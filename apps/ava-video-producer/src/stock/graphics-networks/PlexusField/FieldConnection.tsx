import { SketchedShape } from "../../primitives/SketchedShape";
import type { Point, Drawing } from "./PlexusField.types";
import type { ReactNode } from "react";

type Props = Drawing & {
  source: Point;
  target: Point;
  sourceIndex: number;
  targetOffset: number;
};

/** Renders the field connection layer for PlexusField. */
export function FieldConnection(props: Readonly<Props>): ReactNode {
  const distance = Math.hypot(
    props.source.x - props.target.x,
    props.source.y - props.target.y,
  );
  return distance < props.style.linkDistance ? (
    <SketchedShape
      key={`${props.sourceIndex}-${props.targetOffset}`}
      shape={{
        kind: "line",
        x1: props.source.x,
        y1: props.source.y,
        x2: props.target.x,
        y2: props.target.y,
      }}
      profile={props.sketch.shape}
      stroke={
        (props.sourceIndex + props.targetOffset) % 4 === 0
          ? props.color.accentAlt
          : props.accent
      }
      opacity={
        (1 - distance / props.style.linkDistance) * props.style.linkAlpha
      }
      strokeWidth={props.shapes.stroke(props.style.linkWidth)}
    />
  ) : null;
}
