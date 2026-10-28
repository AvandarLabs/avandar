import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  id: string;
  centerX: number;
  cellWidth: number;
  progress: number;
  selected: boolean;
  accent: string;
};
/** A board cell keeps its outline while its selected region is shaded. */
export function FractionBoardCell({
  id,
  centerX,
  cellWidth,
  progress,
  selected,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        data-piece-owner={id}
        data-selected={selected}
        x={centerX - cellWidth / 2 + 1}
        y={-24}
        width={cellWidth - 2}
        height={48}
        fill={STOCK.surface}
        stroke={STOCK.muted}
      />
      {selected ? (
        <rect
          data-board-shading={id}
          x={centerX - cellWidth / 2 + 3}
          y={22 - 44 * progress}
          width={cellWidth - 6}
          height={44 * progress}
          fill={accent}
        />
      ) : undefined}
    </g>
  );
}
