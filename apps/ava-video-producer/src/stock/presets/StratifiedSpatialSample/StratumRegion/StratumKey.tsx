import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The stratum's number at the head of its caption. */
export function StratumKey({
  index,
  color,
}: Readonly<{ index: number; color: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <text
      x={40 + index * 230}
      y={88}
      fill={color}
      fontSize={tokens.text.graphic.data.fontSize}
      fontFamily={tokens.text.graphic.data.fontFamily}
      fontWeight={tokens.text.graphic.data.fontWeight}
    >
      {index + 1}
    </text>
  );
}
