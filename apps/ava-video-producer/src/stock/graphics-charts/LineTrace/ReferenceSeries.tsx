import { SketchedShape } from "../../primitives/SketchedShape";
import type { Drawing } from "./LineTrace.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the reference series layer for LineTrace. */
export function ReferenceSeries(props: Readonly<Props>): ReactNode {
  return props.input.showReference ? (
    <SketchedShape
      shape={{ kind: "path", d: props.geometry.referencePath }}
      profile={props.sketch.shape}
      fill="none"
      stroke={props.color.accentAlt}
      strokeOpacity={props.atomic.opacity["38"]}
      strokeWidth={props.shapes.stroke(props.stroke.default)}
      strokeDasharray={props.atomic.dash.boundary.join(" ")}
    />
  ) : null;
}
