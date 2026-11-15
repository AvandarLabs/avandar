import { STOCK } from "../../stockPalette";
import { SceneText } from "./SceneText";
import type { Input } from "./ReturningLearnerWorktable.schema";
import type { ReactNode } from "react";

type Props = {
  work: Input["priorWork"][number];
  index: number;
  offset: number;
  accent: string;
};
const MARKS: { drawing: string; writing: string; "number-work": string } = {
  drawing: "M-12 5 L0 -13 L12 5 Z M-7 10 H7",
  writing: "M-12 -13 H12 M-12 -5 H7 M-12 3 H12 M-12 11 H2",
  "number-work": "M-12 -12 V-2 M-6 -12 V-2 M4 -7 H14 M9 -12 V-2 M-12 7 H14",
};
/** Stable original marks travel with their numbered portfolio sample. */
export function PriorWorkSample({
  work,
  index,
  offset,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-work-id={work.id}
      transform={`translate(${280 + index * 50 + offset} 260)`}
    >
      <rect
        x={-20}
        y={-26}
        width={40}
        height={52}
        rx={2}
        fill={STOCK.surface}
        stroke={accent}
      />
      <path
        data-work-marks={work.id}
        d={MARKS[work.form]}
        fill="none"
        stroke={accent}
        strokeWidth={1.5}
      />
      <SceneText
        text={String(index + 1)}
        anchor="middle"
        slot={[0, -34, 40, 12, 1]}
      />
    </g>
  );
}
