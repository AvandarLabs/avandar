import type { Input } from "./ContributionWeave.schema";
import type { ReactNode } from "react";
type Props = {
  warp: Input["warp"][number];
  column: number;
  row: number;
  weft: Input["weft"][number];
  input: Input;
  id: string;
  y: number;
};
/** The visible patch owns the crossing above the perpendicular band. */
export function WeaveCrossing({
  warp,
  column,
  row,
  weft,
  input,
  id,
  y,
}: Readonly<Props>): ReactNode {
  const isWeftOver =
    (row + column) % 2 === (input.weaveStart === "over-first" ? 0 : 1);
  const patternIndex = isWeftOver ? input.warp.length + row : column;
  const patch = {
    x: 376 + (column * 400) / (input.warp.length - 1),
    y: y - 24,
    width: 48,
    height: 48,
    fill: `url(#${id}-band-${patternIndex})`,
  };
  return (
    <rect
      data-crossing={`${row}:${column}`}
      data-over={isWeftOver ? weft.id : warp.id}
      {...patch}
    />
  );
}
