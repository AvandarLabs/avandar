import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ChargeRulers } from "./ChargeRulers";
import { ContextWindows } from "./ContextWindows";
import { getComparisonFromInput } from "./getComparisonFromInput";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ChargeReferenceAlignment.schema";
import type { ReactNode } from "react";
/** Complete fictional source and reference comparison. */
export type Props = GraphicProps & { input: Input };
/** Only identical context opens the signed monetary comparison. */
export function ChargeReferenceAlignment({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { isMatched } = getComparisonFromInput(input);
  return (
    <g data-comparison-matched={isMatched}>
      <LabelSlots
        labels={[
          [input.copy.invoice, 260, 65, 320, 16, 3],
          [input.copy.reference, 610, 65, 320, 16, 3],
          [input.reference.sourceLabel, 610, 350, 285, 12, 3],
          [input.money.currencyLabel, 60, 395, 260, 12, 1],
          [input.copy.example, 60, 582, 840, 12, 1],
        ]}
      />
      <ContextWindows input={input} frame={frame} accent={accent} />
      <LabelSlots
        labels={[
          [
            isMatched ? input.copy.matched : input.copy.unmatched,
            60,
            355,
            500,
            14,
            2,
          ],
          [input.copy.review, 60, 553, 840, 14, 1],
        ]}
      />
      <ChargeRulers input={input} frame={frame} accent={accent} />
    </g>
  );
}
