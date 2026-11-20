import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BallotPaper } from "../BallotPaper/BallotPaper";
import { BallotHand } from "./BallotHand";
import { PrivacyScreen } from "./PrivacyScreen";
import type { getBallotGeometryFromInputAndFrame } from "../getBallotGeometryFromInputAndFrame";
import type { Input } from "../ResidentBudgetBallots.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { x, y, sourceX, cast } = geometry;
  const isHandling = frame >= 16 + index * 2 && frame <= 54 + index * 3;
  return (
    <g>
      <PersonGlyph
        x={sourceX - 10}
        y={136}
        size={28}
        color={tokens.color.textMuted}
      />
      {isHandling ? (
        <BallotHand
          ballotId={ballot.id}
          path={`M${sourceX - 10} 136 L${x + 14} ${y + 16}`}
          accent={accent}
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
        <PrivacyScreen ballotId={ballot.id} sourceX={sourceX} />
      ) : undefined}
    </g>
  );
}
