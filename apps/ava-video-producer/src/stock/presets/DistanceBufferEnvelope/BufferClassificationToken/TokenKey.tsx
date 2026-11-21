import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  point: Readonly<{ x: number; y: number }>;
  index: number;
};

/** The token's stable source key, once it has landed in the ledger. */
export function TokenKey({ point, index }: Readonly<Props>): ReactNode {
  const { color, text } = GraphicThemeHooks.useGraphicTokens();
  return (
    <text
      x={point.x}
      y={point.y + 4}
      fontSize={text.graphic.data.fontSize}
      fontWeight={text.graphic.data.fontWeight}
      textAnchor="middle"
      fill={color.ground}
    >
      {index + 1}
    </text>
  );
}
