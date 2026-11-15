import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";

type Props = { input: Input; learnerX: number; accent: string };
/** The learner carries the same ordered two-action strip. */
export function PracticeStrip({
  input,
  learnerX,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      {input.showPracticeStrip ? (
        <g data-practice-strip="">
          <path
            d={`M${learnerX - 8} 395 L${learnerX - 20} 430`}
            stroke={accent}
            strokeWidth={3}
          />
          <rect
            x={learnerX - 160}
            y={430}
            width={320}
            height={100}
            rx={5}
            fill={STOCK.surface}
            stroke={accent}
          />
          <line
            x1={learnerX}
            x2={learnerX}
            y1={436}
            y2={520}
            stroke={STOCK.line}
          />
          <LabelSlots
            labels={input.stops.map((stop, index) => [
              stop.actionLabel,
              learnerX - 150 + index * 160,
              450,
              140,
              12,
              5,
            ])}
          />
        </g>
      ) : undefined}
    </g>
  );
}
