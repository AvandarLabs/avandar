import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ChargeReferenceAlignment.schema";
import type { getComparisonFromInput } from "./getComparisonFromInput";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  total: number;
  index: number;
  comparison: ReturnType<typeof getComparisonFromInput>;
  progress: number;
  width: number;
  precision: number;
  accent: string;
};
/** A monetary total uses exact minor units and a common eligible ruler. */
export function AmountRuler({
  input,
  total,
  index,
  comparison,
  progress,
  width,
  precision,
  accent,
}: Readonly<Props>): ReactNode {
  const x = comparison.isMatched ? 290 : 290 + index * 320;
  const y = comparison.isMatched ? 425 + index * 39 : 425;
  const amountLabel = (total / input.money.minorUnitsPerUnit).toFixed(
    precision,
  );
  const labelX = comparison.isMatched ? 60 : x;
  const labelY = comparison.isMatched ? y + 5 : y + 44;
  return (
    <g
      key={index}
      data-total-minor={total}
      data-currency-scale={comparison.domain}
    >
      <path
        d={`M${x} ${y - 9} v28 h${width}`}
        fill="none"
        stroke={STOCK.line}
      />
      <rect
        data-amount-ruler={index}
        x={x}
        y={y}
        height={8}
        width={
          (total / comparison.domain) *
          width *
          (comparison.isMatched ? progress : 1)
        }
        fill={index === 0 ? accent : STOCK.cyan}
        fillOpacity={input.focus === "amounts" ? 1 : 0.7}
      />
      <LabelSlots labels={[[amountLabel, labelX, labelY, 200, 14, 1]]} />
    </g>
  );
}
