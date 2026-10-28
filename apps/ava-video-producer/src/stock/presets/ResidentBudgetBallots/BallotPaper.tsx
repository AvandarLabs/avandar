import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { getBallotGeometryFromInputAndFrame } from "./getBallotGeometryFromInputAndFrame";
import type { Input } from "./ResidentBudgetBallots.schema";
import type { ReactNode } from "react";
type Props = {
  ballot: Input["ballots"][number];
  index: number;
  frame: number;
  geometry: ReturnType<typeof getBallotGeometryFromInputAndFrame>;
  isRows: boolean;
  accent: string;
};
/** A paper carries its identity through marking, casting and unfolding. */
export function BallotPaper({
  ballot,
  index,
  frame,
  geometry,
  isRows,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y, width, height, unfold } = geometry;
  const color = ballot.projectId === null ? STOCK.orange : accent;
  return (
    <g
      data-ballot={ballot.id}
      data-choice={ballot.projectId === null ? "abstained" : "cast"}
    >
      <rect
        data-paper={ballot.id}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={3}
        fill={STOCK.surface}
        stroke={color}
      />
      <path
        data-ballot-mark={ballot.id}
        d={`M${x + 6} ${y + 8} l4 4 l6 -7`}
        fill="none"
        stroke={color}
        opacity={ramp(frame, 18 + index * 2, 4) * (1 - unfold)}
      />
      {unfold === 1 ? (
        <LabelSlots
          labels={[[ballot.id, x + 7, y + 12, width - 14, 12, isRows ? 3 : 2]]}
        />
      ) : undefined}
    </g>
  );
}
