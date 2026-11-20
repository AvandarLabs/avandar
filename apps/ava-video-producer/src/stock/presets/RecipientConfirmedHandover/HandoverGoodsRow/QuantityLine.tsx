import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";
/** Offered units against selected units for one good. */
export function QuantityLine({
  content,
  index,
}: Readonly<{ content: Input["contents"][number]; index: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <text
      x={40}
      y={239 + index * 80}
      fill={tokens.color.textMuted}
      fontSize={tokens.text.graphic.data.fontSize}
      fontFamily={tokens.text.graphic.data.fontFamily}
      fontWeight={tokens.text.graphic.data.fontWeight}
    >
      {content.offeredUnits} → {content.selectedUnits}
    </text>
  );
}
