import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** Prints the payment total on the banknote or voucher for `MarketTender`. */
export function TenderTotal({
  total,
  accent,
}: Readonly<{ total: number; accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <text
      x={0}
      y={5}
      fontFamily={tokens.text.graphic.value.fontFamily}
      fontWeight={tokens.text.graphic.value.fontWeight}
      fontSize={tokens.text.graphic.value.fontSize}
      fill={accent}
      textAnchor="middle"
    >
      {total}
    </text>
  );
}
