import { FitText } from "../../primitives/FitText/FitText";
import { ScheduleLabelBackdrop } from "./ScheduleLabelBackdrop";
import { ScheduleValues } from "./ScheduleValues";
import type { ReactNode } from "react";

type Props = {
  index: number;
  label: string;
  value: number;
  unitLabel: string;
  showValues: boolean;
  targetX: number;
  color: string;
  numSlots: number;
};
/** Fixed external label slots keep duration geometry quantitatively honest. */
export function ScheduleLabelSlot({
  index,
  label,
  value,
  unitLabel,
  showValues,
  targetX,
  color,
  numSlots,
}: Readonly<Props>): ReactNode {
  const slotWidth = 880 / numSlots;
  const x = 40 + index * slotWidth;
  return (
    <g>
      <ScheduleLabelBackdrop
        targetX={targetX}
        index={index}
        x={x}
        slotWidth={slotWidth}
        color={color}
      />
      <FitText
        text={label}
        x={x + 12}
        y={440}
        width={slotWidth - 24}
        maxLines={4}
        fontSize={14}
        normalizeWhitespace
        breakLongWords
        color={color}
      />
      {showValues ? (
        <ScheduleValues
          value={value}
          unitLabel={unitLabel}
          x={x}
          slotWidth={slotWidth}
        />
      ) : undefined}
    </g>
  );
}
