import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  hasBoard: boolean;
  progress: number;
  accent: string;
};
/** The board, outlined more heavily as a large-print adaptation lands. */
export function ClassroomBoard({
  hasBoard,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-board-adaptation={hasBoard}
      x={340}
      y={100}
      width={350}
      height={105}
      rx={scales.corner(tokens.corner.cell)}
      fill={tokens.color.surface}
      stroke={hasBoard ? accent : tokens.color.line}
      strokeWidth={scales.stroke(
        Motion.mix({
          t: progress,
          from: tokens.stroke.hairline,
          to: tokens.stroke.emphasis,
        }),
      )}
    />
  );
}
