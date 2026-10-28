import { EASE, mix, ramp } from "../../../motion";
import { ExpenseAmounts } from "./ExpenseAmounts";
import { ExpenseObject } from "./ExpenseObject";
import type { Input } from "./SchoolCostSatchel.schema";
import type { ReactNode } from "react";

type Props = {
  expense: Input["expenses"][number];
  index: number;
  numExpenses: number;
  total: number;
  frame: number;
  accent: string;
  showShares: boolean;
};
/** One unfolded physical object, its amount and its derived cost share. */
export function SatchelExpense({
  expense,
  index,
  numExpenses,
  total,
  frame,
  accent,
  showShares,
}: Readonly<Props>): ReactNode {
  const travel = ramp(frame, 38 + index * 9, 24, EASE.inOut);
  const targetX = 380 + index * (490 / Math.max(1, numExpenses - 1));
  const x = mix(travel, 285, targetX);
  const y = mix(travel, 263, 270) - Math.sin(travel * Math.PI) * 70;
  const revealed = frame >= 62 + index * 9;
  return (
    <g data-expense-id={expense.id} data-amount={expense.amount}>
      <g
        data-expense-object={expense.id}
        transform={`translate(${x} ${y})`}
        opacity={frame >= 38 + index * 9 ? 1 : 0}
      >
        <ExpenseObject kind={expense.object} color={accent} />
      </g>
      {revealed ? (
        <ExpenseAmounts
          expense={expense}
          targetX={targetX}
          total={total}
          accent={accent}
          showShares={showShares}
        />
      ) : undefined}
    </g>
  );
}
