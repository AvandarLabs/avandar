import { STOCK } from "../../stockPalette";
import { SceneText } from "./SceneText";
import type { Input } from "./SchoolCostSatchel.schema";
import type { ReactNode } from "react";

type Props = {
  expense: Input["expenses"][number];
  targetX: number;
  total: number;
  accent: string;
  showShares: boolean;
};
/** Draws the scene's ExpenseAmounts group with fixed authored geometry. */
export function ExpenseAmounts({
  expense,
  targetX,
  total,
  accent,
  showShares,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g>
        <SceneText
          text={expense.label}
          anchor="middle"
          slot={[targetX, 330, 100, 14, 5]}
        />
        <SceneText
          text={String(expense.amount)}
          anchor="middle"
          slot={[targetX, 435, 90, 20, 1]}
        />
        {showShares ? (
          <g>
            <rect
              x={targetX - 44}
              y={453}
              width={88}
              height={6}
              fill={STOCK.line}
            />
            <rect
              data-share-id={expense.id}
              x={targetX - 44}
              y={453}
              width={(88 * expense.amount) / total}
              height={6}
              fill={accent}
            />
            <SceneText
              text={`${expense.amount} / ${total}`}
              anchor="middle"
              slot={[targetX, 479, 96, 12, 1]}
            />
          </g>
        ) : undefined}
      </g>
    </>
  );
}
