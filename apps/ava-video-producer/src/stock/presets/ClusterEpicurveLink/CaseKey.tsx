import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { getCasePositionsFromInput } from "./getCasePositionsFromInput";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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
        <StockRect
          data-focused-key={record.id}
          x={626}
          y={142 + index * 26}
          width={25}
          height={25}
          rx={scales.corner(7)}
          fill="none"
          stroke={tokens.color.highlight}
          opacity={motion.ramp(frame, 90, motion.hero)}
        />
      ) : undefined}
      <text
        x={638.5}
        y={160 + index * 26}
        textAnchor="middle"
        fill={tokens.color.text}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontSize={tokens.text.graphic.data.fontSize}
      >
        {index + 1}
      </text>
    </g>
  );
}
