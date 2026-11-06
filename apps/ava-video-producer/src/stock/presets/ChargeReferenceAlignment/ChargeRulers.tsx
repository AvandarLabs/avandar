import { EASE, ramp } from "../../../motion";
import { AmountRuler } from "./AmountRuler";
import { DifferenceBracket } from "./DifferenceBracket";
import { getComparisonFromInput } from "./getComparisonFromInput";
import type { Input } from "./ChargeReferenceAlignment.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Amount rulers share a zero and exact domain only after eligible alignment.
 */
export function ChargeRulers({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const comparison = getComparisonFromInput(input);
  const progress = comparison.isMatched ? ramp(frame, 71, 54, EASE.inOut) : 0;
  const width = comparison.isMatched ? 600 : 260;
  const amounts = [comparison.billed, comparison.reference];
  const precision = input.money.minorUnitsPerUnit === 100 ? 2 : 0;
  return (
    <g>
      {amounts.map((total, index) => (
        <AmountRuler
          key={index}
          {...{
            input,
            total,
            index,
            comparison,
            progress,
            width,
            precision,
            accent,
          }}
        />
      ))}
      {comparison.isMatched && input.showDifference && frame >= 71 ? (
        <DifferenceBracket
          {...{ input, comparison, progress, precision, accent }}
        />
      ) : null}
    </g>
  );
}
