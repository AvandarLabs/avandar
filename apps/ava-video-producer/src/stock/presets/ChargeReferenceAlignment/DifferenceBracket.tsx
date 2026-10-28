import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./ChargeReferenceAlignment.schema";
import type { getComparisonFromInput } from "./getComparisonFromInput";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  comparison: ReturnType<typeof getComparisonFromInput>;
  progress: number;
  precision: number;
  accent: string;
};
/**
 * Signed eligible difference with a bracket between the exact total endpoints.
 */
export function DifferenceBracket({
  input,
  comparison,
  progress,
  precision,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={progress} data-difference-minor={comparison.difference}>
      <path
        data-difference-bracket=""
        d={`M${290 + (comparison.reference / comparison.domain) * 600 * progress} 490 v8 H${290 + (comparison.billed / comparison.domain) * 600 * progress} v-8`}
        stroke={accent}
        fill="none"
      />
      <LabelSlots
        labels={[
          [input.copy.difference, 60, 525, 520, 14, 1],
          [
            `${comparison.difference! > 0 ? "+" : ""}${(comparison.difference! / input.money.minorUnitsPerUnit).toFixed(precision)}`,
            620,
            525,
            270,
            16,
            1,
          ],
        ]}
      />
    </g>
  );
}
