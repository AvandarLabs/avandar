import { STOCK } from "../../stockPalette";
import { RevenueAmount } from "./RevenueAmount";
import type { Input } from "./TermLimitedRevenueShare.schema";
import type { ReactNode } from "react";

type Props = {
  amounts: number[];
  receipts: number;
  reveal: number;
  input: Input;
  accent: string;
};
/** Three conserved portions share their exact ruler and optional amounts. */
export function RevenuePortions({
  amounts,
  receipts,
  reveal,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {amounts.map((amount, portion) => {
        const offset =
          (amounts.slice(0, portion).reduce((sum, value) => sum + value, 0) *
            340) /
          receipts;
        const color = [STOCK.cyan, STOCK.orange, accent][portion];
        return (
          <g key={portion}>
            <rect
              data-portion={portion}
              x={offset}
              y={45}
              width={((amount * 340) / receipts) * reveal}
              height={40}
              fill={color}
            />
            {input.showAmounts ? (
              <RevenueAmount
                input={input}
                portion={portion}
                amount={amount}
                reveal={reveal}
                color={color}
              />
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}
