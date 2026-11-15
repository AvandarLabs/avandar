import { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import type { Input } from "./GeometryDetailBudget.schema";
/**
 * Retained path grows only through completed deterministic recursion events.
 */
export function makeCompletedDetailPathFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string {
  const { events } = makeDetailSimplificationFromInput(input);
  const span = 60 / events.length;
  const completed = new Set([0, input.vertices.length - 1]);
  events.forEach((candidate, index) => {
    if (candidate.split && frame >= 51 + (index + 1) * span) {
      completed.add(candidate.farthest);
    }
  });
  const indices = [...completed].sort((left, right) => left - right);
  return indices
    .map(
      (index, position) =>
        `${position ? "L" : "M"}${60 + input.vertices[index][0] * 3.6} ${160 + input.vertices[index][1] * 3.6}`,
    )
    .join(" ");
}
