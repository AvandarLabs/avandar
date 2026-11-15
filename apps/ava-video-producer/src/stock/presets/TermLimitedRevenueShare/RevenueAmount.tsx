import { STOCK } from "../../stockPalette";
import type { Input } from "./TermLimitedRevenueShare.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  portion: number;
  amount: number;
  reveal: number;
  color: string;
};
/** Exact optional monetary labels retain the common minor-unit convention. */
export function RevenueAmount({
  input,
  portion,
  amount,
  reveal,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <g data-amount={portion} opacity={reveal}>
      <circle cx={8 + portion * 115} cy={105} r={4} fill={color} />
      <text x={18 + portion * 115} y={110} fill={STOCK.text} fontSize={12}>
        {(amount / input.money.minorUnitsPerUnit).toFixed(
          input.money.minorUnitsPerUnit === 100 ? 2 : 0,
        )}
      </text>
    </g>
  );
}
