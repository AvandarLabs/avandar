import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { value: number; unitLabel: string; x: number; slotWidth: number };
/** Duration values and their common unit occupy fixed external slots. */
export function ScheduleValues({
  value,
  unitLabel,
  x,
  slotWidth,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={Number(value.toFixed(1)).toString()}
        x={x + 12}
        y={518}
        width={slotWidth - 24}
        maxLines={1}
        fontSize={16}
        normalizeWhitespace
      />
      <FitText
        text={unitLabel}
        x={x + 12}
        y={543}
        width={slotWidth - 24}
        maxLines={2}
        fontSize={12}
        normalizeWhitespace
        breakLongWords
        color={STOCK.muted}
      />
    </g>
  );
}
