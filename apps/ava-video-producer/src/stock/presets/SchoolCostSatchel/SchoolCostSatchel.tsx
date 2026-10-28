import { STOCK } from "../../stockPalette";
import { SatchelExpense } from "./SatchelExpense";
import { SatchelHeading } from "./SatchelHeading";
import { SatchelSetting } from "./SatchelSetting";
import { SatchelTotal } from "./SatchelTotal";
import { SceneText } from "./SceneText";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SchoolCostSatchel.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Opens the carried satchel into exactly the authored period-normalized costs.
 */
export function SchoolCostSatchel({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const expenses =
    input.unpackOrder === "largest-first"
      ? [...input.expenses].sort((left, right) => right.amount - left.amount)
      : input.expenses;
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return (
    <g data-total={total}>
      <SatchelHeading input={input} />
      <SatchelSetting frame={frame} accent={accent} />
      <SceneText
        text={input.sceneLabels.learner}
        anchor="middle"
        slot={[180, 347, 230, 14, 3]}
      />
      <path
        d="M325 304 H923 L909 320 H311 Z"
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      {expenses.map((expense, index) => (
        <SatchelExpense
          key={expense.id}
          expense={expense}
          index={index}
          numExpenses={expenses.length}
          total={total}
          frame={frame}
          accent={accent}
          showShares={input.showExpenseShares}
        />
      ))}
      <SatchelTotal input={input} frame={frame} accent={accent} total={total} />
      <SceneText
        text={input.caption}
        anchor="middle"
        slot={[480, 573, 850, 14, 2]}
      />
    </g>
  );
}
