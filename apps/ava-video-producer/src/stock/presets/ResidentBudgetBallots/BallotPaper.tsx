import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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

/** The resident's tick, marked on their turn and hidden as it unfolds. */
function BallotMark({
  ballotId,
  x,
  y,
  index,
  frame,
  unfold,
  color,
}: Readonly<{
  ballotId: string;
  x: number;
  y: number;
  index: number;
  frame: number;
  unfold: number;
  color: string;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <g data-ballot-mark={ballotId}>
      <SketchedShape
        shape={{ kind: "path", d: `M${x + 6} ${y + 8} l4 4 l6 -7` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={color}
        opacity={
          motion.ramp(
            frame,
            18 + index * motion.stagger.list,
            motion.press.duration,
            motion.entrance.easing,
          ) *
          (1 - unfold)
        }
      />
    </g>
  );
}
