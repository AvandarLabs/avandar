import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  const comparison = getComparisonFromInput(input);
  const progress = comparison.isMatched
    ? motion.ramp(frame, 71, motion.scale(54), motion.travel.easing)
    : 0;
  const width = comparison.isMatched ? 600 : 260;
  const amounts = [comparison.billed, comparison.reference];
  const precision = input.money.minorUnitsPerUnit === 100 ? 2 : 0;
  return (
    <g>
      {amounts.map((total, index) => {
        return (
          // prettier-ignore
          // The two ruler slots always mean billed amount then
          // reference amount. Their identities remain fixed as
          // totals change.
          // react-doctor-disable-next-line no-array-index-as-key
          <AmountRuler key={index}
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
        );
      })}
      {comparison.isMatched && input.showDifference && frame >= 71 ? (
        <DifferenceBracket
          {...{ input, comparison, progress, precision, accent }}
        />
      ) : null}
    </g>
  );
}
