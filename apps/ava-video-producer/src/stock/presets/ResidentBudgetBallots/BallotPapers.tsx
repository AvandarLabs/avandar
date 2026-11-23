import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BallotResident } from "./BallotResident/BallotResident";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g>
      {input.ballots.map((ballot, index) => {
        return (
          <BallotResident
            key={ballot.id}
            ballot={ballot}
            index={index}
            frame={frame}
            geometry={getBallotGeometryFromInputAndFrame({
              input,
              frame,
              index,
              motion,
            })}
            isRows={input.tallyArrangement === "rows"}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
