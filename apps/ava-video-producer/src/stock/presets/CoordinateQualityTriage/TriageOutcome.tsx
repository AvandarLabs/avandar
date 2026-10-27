import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./CoordinateQualityTriage.schema";
import type { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import type { ReactNode } from "react";
type Props = {
  outcome: ReturnType<
    typeof makeCoordinateTriageFromInputAndFrame
  >["counts"][number];
  index: number;
  labels: Input["labels"];
};
/** A tray owns its reason caption, key space and reconciled count. */
export function TriageOutcome({
  outcome,
  index,
  labels,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {index ? (
        <rect
          data-tray-body={outcome.reason}
          x={40 + (index - 1) * 135}
          y={425}
          width={120}
          height={68}
          rx={8}
          fill="none"
          stroke={STOCK.line}
        />
      ) : undefined}
      <text
        data-outcome-count={outcome.count}
        x={index ? 145 + (index - 1) * 135 : 370}
        y={index ? 422 : 132}
        fontSize={20}
        fill={STOCK.text}
        textAnchor="end"
      >
        {outcome.count}
      </text>
      {index ? (
        <LabelSlots
          labels={[
            [labels[outcome.reason], 40 + (index - 1) * 135, 516, 120, 12, 6],
          ]}
        />
      ) : undefined}
    </g>
  );
}
