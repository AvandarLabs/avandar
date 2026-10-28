import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";
type Props = {
  kind: "source" | "excluded" | "transferred";
  label: string;
  value: number;
  x: number;
  width: number;
  input: Input;
};
/**
 * One explicit denominator keeps its complete supplied caption and row unit.
 */
export function PushdownCount({
  kind,
  label,
  value,
  x,
  width,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g data-accounting={kind}>
      <LabelSlots
        labels={[
          [label, x, 506, width, 12, 3],
          ...(input.showTotals
            ? [
                [`${value} ${input.metric.rowUnit}`, x, 558, width, 12, 3] as [
                  string,
                  number,
                  number,
                  number,
                  12,
                  number,
                ],
              ]
            : []),
        ]}
      />
    </g>
  );
}
