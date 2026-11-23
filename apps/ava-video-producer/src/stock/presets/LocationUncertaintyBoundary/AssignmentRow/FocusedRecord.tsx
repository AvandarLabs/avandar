import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { id: string; index: number; accent: string };
/** Highlights the focused assignment record. */
export function FocusedRecord({
  id,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-focused-record={id}
      x={472}
      y={315 + index * 31}
      width={370}
      height={25}
      rx={scales.corner(tokens.corner.chip)}
      fill={accent}
      fillOpacity={scales.wash(tokens.alpha.tint)}
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}
