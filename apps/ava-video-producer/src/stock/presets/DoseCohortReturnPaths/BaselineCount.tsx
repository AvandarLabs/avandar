import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The number of participants beside the baseline caption. */
export function BaselineCount({
  count: participantCount,
}: Readonly<{ count: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <text
      x={415}
      y={60}
      fill={tokens.color.text}
      fontFamily={tokens.text.graphic.label.fontFamily}
      fontWeight={tokens.text.graphic.label.fontWeight}
      fontSize={tokens.text.graphic.label.fontSize}
    >
      {participantCount}
    </text>
  );
}
