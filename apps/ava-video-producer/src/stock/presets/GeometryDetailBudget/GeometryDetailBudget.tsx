import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { DetailLedger } from "./DetailLedger";
import { DetailRecursion } from "./DetailRecursion";
import { DetailTrace } from "./DetailTrace";
import { TraceLegend } from "./TraceLegend";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Recursive detail reduction preserves source vertices and finite deviations.
 */
export function GeometryDetailBudget({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 40, 34, 880, 16, 2],
          [input.copy.before, 40, 78, 400, 14, 3],
          [input.copy.after, 480, 78, 440, 14, 3],
        ]}
      />
      <DetailTrace input={input} frame={frame} accent={accent} />
      <DetailRecursion input={input} frame={frame} accent={accent} />
      <TraceLegend labels={input.labels} accent={accent} />
      <DetailLedger input={input} frame={frame} />
    </g>
  );
}
