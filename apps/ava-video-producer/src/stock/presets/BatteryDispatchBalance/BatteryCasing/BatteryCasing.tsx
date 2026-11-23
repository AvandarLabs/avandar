import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the surface with authored geometry. */
export function BatteryCasing({
  x,
  y,
  scales,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <StockRect
      x={x}
      y={y}
      width={164}
      height={170}
      rx={scales.corner(tokens.corner.card)}
      fill={tokens.color.surface}
      stroke={tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}
