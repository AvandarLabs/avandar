import { DrawPath } from "../../graphics-common";
import type { Input } from "./GeometryDetailBudget.schema";
import type { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  event: ReturnType<typeof makeDetailSimplificationFromInput>["events"][number];
  frame: number;
  at: number;
  duration: number;
  accent: string;
};
/**
 * A qualifying split draws the actual two child segments through its vertex.
 */
export function RecursiveSplit({
  input,
  event,
  frame,
  at,
  duration,
  accent,
}: Readonly<Props>): ReactNode {
  const start = input.vertices[event.start];
  const farthest = input.vertices[event.farthest];
  const end = input.vertices[event.end];
  return (
    <DrawPath
      d={`M${60 + start[0] * 3.6} ${160 + start[1] * 3.6} L${60 + farthest[0] * 3.6} ${160 + farthest[1] * 3.6} L${60 + end[0] * 3.6} ${160 + end[1] * 3.6}`}
      frame={frame}
      at={at}
      duration={duration}
      color={accent}
      width={2}
    />
  );
}
