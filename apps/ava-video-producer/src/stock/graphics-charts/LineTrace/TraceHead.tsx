import { SketchedShape } from "../../primitives/SketchedShape";
import type { Drawing } from "./LineTrace.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the trace head layer for LineTrace. */
export function TraceHead(props: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${props.geometry.head.x} ${props.geometry.head.y} V458`,
        }}
        profile={props.sketch.shape}
        stroke={props.accent}
        strokeOpacity={props.atomic.opacity["22"]}
        strokeWidth={props.shapes.stroke(props.stroke.hairline)}
        strokeDasharray={props.dash.guide.join(" ")}
      />
      <circle
        cx={props.geometry.head.x}
        cy={props.geometry.head.y}
        r={12}
        fill={props.accent}
        fillOpacity={props.shapes.wash(props.atomic.opacity["10"])}
      />
      <circle
        cx={props.geometry.head.x}
        cy={props.geometry.head.y}
        r={5.5}
        fill={props.accent}
      />
    </>
  );
}
