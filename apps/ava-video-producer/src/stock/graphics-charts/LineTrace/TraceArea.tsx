import { SketchedShape } from "../../primitives/SketchedShape";
import type { Drawing } from "./LineTrace.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the trace area layer for LineTrace. */
export function TraceArea(props: Readonly<Props>): ReactNode {
  return (
    <>
      <path
        d={`${props.geometry.tracePath} L839 458 H121 Z`}
        fill={`url(#${props.id}-chart-fill)`}
      />
      <SketchedShape
        shape={{ kind: "path", d: props.geometry.tracePath }}
        profile={props.sketch.shape}
        fill="none"
        stroke={props.accent}
        strokeWidth={props.shapes.stroke(props.stroke.route)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}
