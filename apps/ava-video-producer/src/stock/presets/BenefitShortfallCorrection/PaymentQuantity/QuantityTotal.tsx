import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/**
 * Prints an independently counted payment quantity below its key for
 * `PaymentQuantity`.
 */
export function QuantityTotal({
  index,
  total,
}: Readonly<{ index: number; total: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <text
      data-quantity-total={index}
      x={76 + index * 224}
      y={258}
      fill={tokens.color.text}
      fontFamily={tokens.text.graphic.body.fontFamily}
      fontWeight={tokens.text.graphic.body.fontWeight}
      fontSize={tokens.text.graphic.body.fontSize}
    >
      {total}
    </text>
  );
}
