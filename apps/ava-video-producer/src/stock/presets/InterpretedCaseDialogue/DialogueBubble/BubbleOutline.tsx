import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  turnId: string;
  x: number;
  y: number;
  interpreted: boolean;
  accent: string;
};
/** The bubble. An interpreted wording is smaller and finer than its source. */
export function BubbleOutline({
  turnId,
  x,
  y,
  interpreted,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-bubble={turnId}
      x={x}
      y={y}
      width={interpreted ? 382 : 402}
      height={interpreted ? 150 : 155}
      rx={scales.corner(tokens.corner.card)}
      fill={tokens.color.surface}
      stroke={interpreted ? tokens.color.accentAlt : accent}
      strokeWidth={scales.stroke(
        interpreted ? tokens.stroke.hairline : tokens.stroke.default,
      )}
    />
  );
}
