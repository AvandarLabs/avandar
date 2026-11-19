import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { SatchelExpense } from "./SatchelExpense";
import { SatchelHeading } from "./SatchelHeading";
import { SatchelSetting } from "./SatchelSetting";
import { SatchelTotal } from "./SatchelTotal";
import { SceneText } from "./SceneText";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const tokens = useGraphicTokens();
  const expenses =
    input.unpackOrder === "largest-first"
      ? [...input.expenses].sort((left, right) => {
          return right.amount - left.amount;
        })
      : input.expenses;
  const total = expenses.reduce((sum, expense) => {
    return sum + expense.amount;
  }, 0);
  return (
    <g data-total={total}>
      <SatchelHeading input={input} />
      <SatchelSetting frame={frame} accent={accent} />
      <SceneText
        text={input.sceneLabels.learner}
        anchor="middle"
        slot={[180, 347, 230, 14, 3]}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M325 304 H923 L909 320 H311 Z" }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      {expenses.map((expense, index) => {
        return (
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
        );
      })}
      <SatchelTotal input={input} frame={frame} accent={accent} total={total} />
      <SceneText
        text={input.caption}
        anchor="middle"
        slot={[480, 573, 850, 14, 2]}
      />
    </g>
  );
}
