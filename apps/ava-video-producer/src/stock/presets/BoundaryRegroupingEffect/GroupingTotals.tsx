import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./BoundaryRegroupingEffect.schema";
import type { ReactNode } from "react";
type Props = { input: Input; records: number; population: number };
/** Overall numerator and denominator remain visible for both partitions. */
export function GroupingTotals({
  input,
  records,
  population,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.total, 60, 520, 270, 14, 4],
          [String(records), 360, 510, 260, 18, 1],
          [input.copy.records, 360, 536, 260, 12, 4],
          [String(population), 650, 510, 250, 18, 1],
          [input.copy.population, 650, 536, 250, 12, 4],
        ]}
      />
      {input.measure === "normalized" ? (
        <LabelSlots
          labels={[
            [input.copy.per, 520, 90, 280, 12, 3],
            [String(input.rateBase), 830, 90, 70, 16, 1],
          ]}
        />
      ) : undefined}
    </g>
  );
}
