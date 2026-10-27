import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { CoordinateGraticule } from "./CoordinateGraticule";
import { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import { TriageOutcome } from "./TriageOutcome";
import type { Input } from "./CoordinateQualityTriage.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Numeric graticule, diagnostic trays and reconciled outcome counts. */
export function TriagePlane({ input, frame }: Readonly<Props>): ReactNode {
  const { counts } = makeCoordinateTriageFromInputAndFrame({ input, frame });
  return (
    <g>
      <CoordinateGraticule />
      <LabelSlots
        labels={[
          [input.labels.plotted, 40, 132, 290, 14, 3],
          [input.labels.total, 480, 553, 350, 12, 3],
        ]}
      />
      <text
        data-row-total={input.rows.length}
        x={880}
        y={553}
        fontSize={20}
        fill={STOCK.text}
      >
        <tspan>{input.rows.length}</tspan>
      </text>
      {counts.map((outcome, index) => (
        <TriageOutcome
          key={outcome.reason}
          outcome={outcome}
          index={index}
          labels={input.labels}
        />
      ))}
    </g>
  );
}
