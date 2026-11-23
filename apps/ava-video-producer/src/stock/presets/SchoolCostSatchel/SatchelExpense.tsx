import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ExpenseAmounts } from "./ExpenseAmounts/ExpenseAmounts";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  const travel = motion.ramp(
    frame,
    38 + index * motion.scaleStagger(9),
    motion.scale(24),
    motion.travel.easing,
  );
  const targetX = 380 + index * (490 / Math.max(1, numExpenses - 1));
  const x = Motion.mix({ t: travel, from: 285, to: targetX });
  const y =
    Motion.mix({ t: travel, from: 263, to: 270 }) -
    Math.sin(travel * Math.PI) * 70;
  const revealed = frame >= 62 + index * motion.scaleStagger(9);
  return (
    <g data-expense-id={expense.id} data-amount={expense.amount}>
      <g
        data-expense-object={expense.id}
        transform={`translate(${x} ${y})`}
        opacity={frame >= 38 + index * motion.scaleStagger(9) ? 1 : 0}
      >
        <ExpenseObject kind={expense.object} color={accent} />
      </g>
      {revealed ? (
        <ExpenseAmounts {...{ expense, targetX, total, accent, showShares }} />
      ) : undefined}
    </g>
  );
}
