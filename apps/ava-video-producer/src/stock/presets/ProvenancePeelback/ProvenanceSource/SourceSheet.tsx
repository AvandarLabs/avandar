import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The sheet itself, turned open by `angle` about its centre. */
export function SourceSheet({
  height,
  angle,
  stroke,
}: Readonly<{ height: number; angle: number; stroke: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      x={0}
      y={0}
      width={400}
      height={height}
      rx={scales.corner(3)}
      fill={tokens.color.surface}
      stroke={stroke}
      transform={`rotate(${angle} 200 ${height / 2})`}
    />
  );
}
