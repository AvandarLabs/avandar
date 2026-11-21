import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  total: number;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the total with authored geometry. */
export function MarketCheckoutTotal({
  total,
  accent,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <text
      data-total={total}
      x={550}
      y={521}
      fill={accent}
      fontFamily={tokens.text.graphic.secondary.fontFamily}
      fontWeight={tokens.text.graphic.secondary.fontWeight}
      fontSize={tokens.text.graphic.secondary.fontSize}
    >
      {total}
    </text>
  );
}
