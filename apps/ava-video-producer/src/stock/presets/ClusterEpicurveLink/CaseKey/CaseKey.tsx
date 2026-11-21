import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FocusRing } from "./FocusRing";
import type { getCasePositionsFromInput } from "../getCasePositionsFromInput";
import type { ReactNode } from "react";

type Props = {
  position: ReturnType<typeof getCasePositionsFromInput>[number];
  frame: number;
  accent: string;
};
/** Stable numeric keys match map records to their histogram units. */
export function CaseKey({
  position,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { record, index, isInvestigated, isFocused } = position;
  return (
    <g>
      <StockRect
        x={627}
        y={143 + index * 26}
        width={23}
        height={23}
        rx={scales.corner(6)}
        fill={tokens.color.surface}
        stroke={isInvestigated ? accent : tokens.color.line}
      />
      {isFocused ? (
        <FocusRing recordId={record.id} index={index} frame={frame} />
      ) : undefined}
      <text
        x={638.5}
        y={160 + index * 26}
        textAnchor="middle"
        fill={tokens.color.text}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
      >
        {index + 1}
      </text>
    </g>
  );
}
