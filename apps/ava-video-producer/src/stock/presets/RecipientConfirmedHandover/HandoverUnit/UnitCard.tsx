import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The unit's card, under its good's symbol. */
export function UnitCard({ accent }: Readonly<{ accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      x={-12}
      y={-14}
      width={24}
      height={28}
      rx={scales.corner(tokens.corner.chip)}
      fill={tokens.color.surface}
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.outline)}
    />
  );
}
