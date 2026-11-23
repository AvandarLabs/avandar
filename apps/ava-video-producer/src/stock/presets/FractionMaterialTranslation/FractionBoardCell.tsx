import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      <StockRect
        data-piece-owner={id}
        data-selected={selected}
        x={centerX - cellWidth / 2 + 1}
        y={-24}
        width={cellWidth - 2}
        height={48}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
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
