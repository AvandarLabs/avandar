import { SceneText } from "../SceneText";
import { useExpenseAmountsPresentation } from "./useExpenseAmountsPresentation";
import type { Input } from "../SchoolCostSatchel.schema.ts";
import type { ReactNode } from "react";

type Props = {
  expense: Input["expenses"][number];
  targetX: number;
  total: number;
  accent: string;
  showShares: boolean;
};
/** Draws the scene's ExpenseAmounts group with fixed authored geometry. */
export function ExpenseAmounts(props: Readonly<Props>): ReactNode {
  const presentation = useExpenseAmountsPresentation(props);

  return (
    <>
      <g>
        <SceneText
          text={props.expense.label}
          anchor="middle"
          slot={[props.targetX, 330, 100, 14, 5]}
        />
        <SceneText
          text={String(props.expense.amount)}
          anchor="middle"
          slot={[props.targetX, 435, 90, 20, 1]}
        />
        {props.showShares ? (
          <g>
            <rect
              x={props.targetX - 44}
              y={453}
              width={88}
              height={6}
              fill={presentation.tokens.color.line}
            />
            <rect
              data-share-id={props.expense.id}
              x={props.targetX - 44}
              y={453}
              width={(88 * props.expense.amount) / props.total}
              height={6}
              fill={props.accent}
            />
            <SceneText
              text={`${props.expense.amount} / ${props.total}`}
              anchor="middle"
              slot={[props.targetX, 479, 96, 12, 1]}
            />
          </g>
        ) : undefined}
      </g>
    </>
  );
}
