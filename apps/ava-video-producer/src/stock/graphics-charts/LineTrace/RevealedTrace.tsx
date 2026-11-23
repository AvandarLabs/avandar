import { TraceArea } from "./TraceArea";
import type { Drawing } from "./LineTrace.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the revealed trace layer for LineTrace. */
export function RevealedTrace(props: Readonly<Props>): ReactNode {
  return (
    <g clipPath={`url(#${props.id}-chart-clip)`}>
      <TraceArea {...props} />
      {props.geometry.points.map((point, index) => {
        return (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={3}
            fill={props.accent}
          />
        );
      })}
    </g>
  );
}
