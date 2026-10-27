import { DrawPath } from "../../graphics-common";
import { STOCK } from "../../stockPalette";
import type { Input } from "./GeometryDetailBudget.schema";
import type { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  event: ReturnType<typeof makeDetailSimplificationFromInput>["events"][number];
  frame: number;
  at: number;
  duration: number;
};
/** Current chord and perpendicular guide expose the evaluated recursion. */
export function ActiveDeviation({
  input,
  event,
  frame,
  at,
  duration,
}: Readonly<Props>): ReactNode {
  const start = input.vertices[event.start];
  const end = input.vertices[event.end];
  const farthest = input.vertices[event.farthest];
  return (
    <g>
      <line
        data-recursion-chord="active"
        data-active-segment={`${event.start}:${event.end}`}
        data-farthest-index={event.farthest}
        x1={60 + start[0] * 3.6}
        y1={160 + start[1] * 3.6}
        x2={60 + end[0] * 3.6}
        y2={160 + end[1] * 3.6}
        stroke={STOCK.orange}
        strokeDasharray="5 5"
      />
      {input.showDeviationGuides ? (
        <DrawPath
          d={`M${60 + event.projection[0] * 3.6} ${160 + event.projection[1] * 3.6} L${60 + farthest[0] * 3.6} ${160 + farthest[1] * 3.6}`}
          frame={frame}
          at={at}
          duration={duration}
          color={STOCK.orange}
          width={2}
        />
      ) : undefined}
    </g>
  );
}
