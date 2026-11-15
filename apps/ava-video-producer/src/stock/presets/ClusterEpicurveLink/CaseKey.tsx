import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
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
  const { record, index, isInvestigated, isFocused } = position;
  return (
    <g>
      <rect
        x={627}
        y={143 + index * 26}
        width={23}
        height={23}
        rx={6}
        fill={STOCK.surface}
        stroke={isInvestigated ? accent : STOCK.line}
      />
      {isFocused ? (
        <rect
          data-focused-key={record.id}
          x={626}
          y={142 + index * 26}
          width={25}
          height={25}
          rx={7}
          fill="none"
          stroke={STOCK.orange}
          opacity={ramp(frame, 90, 18)}
        />
      ) : undefined}
      <text
        x={638.5}
        y={160 + index * 26}
        textAnchor="middle"
        fill={STOCK.text}
        fontSize={12}
      >
        {index + 1}
      </text>
    </g>
  );
}
