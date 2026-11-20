import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BallotMark } from "./BallotMark";
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
/** A paper carries its identity through marking, casting and unfolding. */
export function BallotPaper({
  ballot,
  index,
  frame,
  geometry,
  isRows,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { x, y, width, height, unfold } = geometry;
  const color = ballot.projectId === null ? tokens.color.highlight : accent;
  return (
    <g
      data-ballot={ballot.id}
      data-choice={ballot.projectId === null ? "abstained" : "cast"}
    >
      <StockRect
        data-paper={ballot.id}
        x={x}
        y={y}
        width={width}
        height={height}
        rx={scales.corner(3)}
        fill={tokens.color.surface}
        stroke={color}
      />
      <BallotMark
        ballotId={ballot.id}
        {...{ x, y, index, frame, unfold, color }}
      />
      {unfold === 1 ? (
        <LabelSlots
          labels={[[ballot.id, x + 7, y + 12, width - 14, 12, isRows ? 3 : 2]]}
        />
      ) : undefined}
    </g>
  );
}
