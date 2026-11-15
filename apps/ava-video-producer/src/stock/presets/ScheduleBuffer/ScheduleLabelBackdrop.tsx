import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  targetX: number;
  index: number;
  x: number;
  slotWidth: number;
  color: string;
};
/** A leader connects each external label slot to its own segment. */
export function ScheduleLabelBackdrop({
  targetX,
  index,
  x,
  slotWidth,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <path
        d={`M${targetX} 371 V${382 + index * 3} L${x + slotWidth / 2} 414`}
        fill="none"
        stroke={color}
        strokeOpacity={0.55}
      />
      <rect
        data-label-slot={index}
        x={x + 4}
        y={418}
        width={slotWidth - 8}
        height={155}
        rx={8}
        fill={STOCK.surface}
      />
    </g>
  );
}
