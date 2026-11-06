import { ramp } from "../../../motion";
import { makeCountCopyPositionFromFrame } from "./makeCountCopyPositionFromFrame";
import type { makePublicCellsFromInput } from "./makePublicCellsFromInput";
import type { ReactNode } from "react";

type Props = {
  cell: ReturnType<typeof makePublicCellsFromInput>[number];
  frame: number;
  accent: string;
};
/** Only permitted numeric copies travel between the local and released maps. */
export function ReleasedCountToken({
  cell,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y } = makeCountCopyPositionFromFrame({ frame, index: cell.index });
  return (
    <text
      data-released-count={cell.value}
      aria-label={String(cell.value)}
      x={x}
      y={y}
      fontSize={14}
      fill={accent}
      fontFamily="Arial, sans-serif"
      textAnchor="middle"
      opacity={ramp(frame, 106 + cell.index * 2, 4)}
    >
      {cell.value}
    </text>
  );
}
