import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  y: number;
};
/** Each numeric lane owns a fixed range, label, unit and current-value slot. */
export function RehearsalRuler({
  label,
  unit,
  min,
  max,
  value,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={label}
        x={64}
        y={y - 14}
        width={270}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <path
        d={`M380 ${y} H650 M380 ${y - 7} V${y + 7} M650 ${y - 7} V${y + 7}`}
        stroke={STOCK.line}
        strokeWidth={2}
      />
      <FitText
        text={String(min)}
        x={380}
        y={y + 24}
        width={128}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
        color={STOCK.muted}
      />
      <FitText
        text={String(max)}
        x={650}
        y={y + 24}
        width={128}
        fontSize={12}
        maxLines={2}
        anchor="end"
        breakLongWords
        normalizeWhitespace
        color={STOCK.muted}
      />
      <FitText
        text={unit}
        x={716}
        y={y - 14}
        width={180}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
        color={STOCK.muted}
      />
      <FitText
        text={String(value)}
        x={716}
        y={y + 20}
        width={180}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
