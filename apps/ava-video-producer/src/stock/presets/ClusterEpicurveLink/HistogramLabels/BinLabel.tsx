import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** A time bin's number beside its label, three bins to a row. */
export function BinLabel({
  label,
  index,
}: Readonly<{ label: string; index: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const y = 385 + Math.floor(index / 3) * 48;
  return (
    <g>
      <text
        x={40 + (index % 3) * 195}
        y={y}
        fill={tokens.color.textMuted}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
      >
        {index + 1}
      </text>
      <LabelSlots labels={[[label, 58 + (index % 3) * 195, y, 175, 12, 3]]} />
    </g>
  );
}
