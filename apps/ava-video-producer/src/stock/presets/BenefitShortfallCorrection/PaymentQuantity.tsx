import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  label: string;
  index: number;
  total: number;
  showTotals: boolean;
  accent: string;
};
/** A pattern key names one independently counted payment quantity. */
export function PaymentQuantity({
  label,
  index,
  total,
  showTotals,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        x={48 + index * 224}
        y={187}
        width={18}
        height={18}
        fill={index === 1 ? accent : index === 2 ? STOCK.cyan : "none"}
        stroke={index === 3 ? STOCK.orange : STOCK.muted}
        strokeDasharray={index === 3 ? "3 3" : undefined}
      />
      {index === 2 ? (
        <path
          d={`M${50 + index * 224} 202 l13 -12`}
          stroke={STOCK.ground}
          strokeWidth={3}
        />
      ) : undefined}
      <LabelSlots labels={[[label, 76 + index * 224, 200, 192, 12, 3]]} />
      {showTotals ? (
        <text
          data-quantity-total={index}
          x={76 + index * 224}
          y={258}
          fill={STOCK.text}
          fontSize={20}
        >
          {total}
        </text>
      ) : undefined}
    </g>
  );
}
