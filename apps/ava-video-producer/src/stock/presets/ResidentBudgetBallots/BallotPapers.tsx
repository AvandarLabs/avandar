import { BallotResident } from "./BallotResident";
import { getBallotGeometryFromInputAndFrame } from "./getBallotGeometryFromInputAndFrame";
import type { Input } from "./ResidentBudgetBallots.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Exactly one paper and neutral resident are derived from each ballot. */
export function BallotPapers({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.ballots.map((ballot, index) => (
        <BallotResident
          key={ballot.id}
          ballot={ballot}
          index={index}
          frame={frame}
          geometry={getBallotGeometryFromInputAndFrame({ input, frame, index })}
          isRows={input.tallyArrangement === "rows"}
          accent={accent}
        />
      ))}
    </g>
  );
}
