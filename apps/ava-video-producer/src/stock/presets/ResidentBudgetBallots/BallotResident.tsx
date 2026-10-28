import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { BallotPaper } from "./BallotPaper";
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
/**
 * A resident marks a private paper, then carries it or retains an abstention.
 */
export function BallotResident({
  ballot,
  index,
  frame,
  geometry,
  isRows,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y, sourceX, cast } = geometry;
  const isHandling = frame >= 16 + index * 2 && frame <= 54 + index * 3;
  return (
    <g>
      <PersonGlyph x={sourceX - 10} y={136} size={28} color={STOCK.muted} />
      {isHandling ? (
        <path
          data-ballot-hand={ballot.id}
          d={`M${sourceX - 10} 136 L${x + 14} ${y + 16}`}
          fill="none"
          stroke={accent}
          strokeWidth={3}
        />
      ) : undefined}
      <BallotPaper
        ballot={ballot}
        index={index}
        frame={frame}
        geometry={geometry}
        isRows={isRows}
        accent={accent}
      />
      {cast === 0 && frame < 40 + index * 3 ? (
        <rect
          data-privacy-screen={ballot.id}
          x={sourceX - 2}
          y={118}
          width={42}
          height={46}
          fill={STOCK.surface}
          stroke={STOCK.line}
        />
      ) : undefined}
    </g>
  );
}
