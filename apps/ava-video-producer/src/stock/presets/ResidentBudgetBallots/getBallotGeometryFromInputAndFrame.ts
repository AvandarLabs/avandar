import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./ResidentBudgetBallots.schema";

/** Data for getBallotGeometryFromInputAndFrame. */
type GetBallotGeometryResult = {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceX: number;
  cast: number;
  unfold: number;
};

type BallotGeometryArgs = Readonly<{
  input: Input;
  frame: number;
  index: number;
  motion: VideoMotion;
}>;

type ColumnWidthOptions = {
  input: BallotGeometryArgs["input"];
  frame: BallotGeometryArgs["frame"];
  index: BallotGeometryArgs["index"];
  motion: BallotGeometryArgs["motion"];
};

type ColumnWidthResult = {
  columnWidth: number;
  isRows: boolean;
  targetX: ReturnType<typeof _getTallyTarget>["targetX"];
  targetY: ReturnType<typeof _getTallyTarget>["targetY"];
  sourceX: number;
  cast: number;
  lift: number;
  unfold: number;
};

type GetBallotGeometryFromInputAndFrameYOptions = {
  targetY: ColumnWidthResult["targetY"];
  cast: ColumnWidthResult["cast"];
  lift: ColumnWidthResult["lift"];
  unfold: ColumnWidthResult["unfold"];
};

/**
 * Samples the ballot geometry from input and frame y for the current authored
 * frame.
 */
function _getBallotGeometryFromInputAndFrameY({
  targetY,
  cast,
  lift,
  unfold,
}: Readonly<GetBallotGeometryFromInputAndFrameYOptions>): number {
  return Motion.mix({
    t: unfold,
    from: Motion.mix({
      t: lift,
      from: Motion.mix({
        t: cast,
        from: 118,
        to: 264,
      }),
      to: 206,
    }),
    to: targetY,
  });
}

/** Where a ballot lands in its project's tally, in rows or a column. */
function _getTallyTarget({
  input,
  index,
  columnWidth,
}: Readonly<{
  input: Input;
  index: number;
  columnWidth: number;
}>) {
  const ballot = input.ballots[index];
  const column =
    ballot.projectId === null
      ? input.projects.length
      : input.projects.findIndex(
          propEq<
            {
              id: unknown;
            },
            "id",
            unknown
          >("id", ballot.projectId),
        );
  const row = input.ballots
    .slice(0, index)
    .filter(propEq("projectId", ballot.projectId)).length;
  const isRows = input.tallyArrangement === "rows";
  return {
    targetX:
      48 + column * columnWidth + (isRows ? (row % 2) * (columnWidth / 2) : 0),
    targetY: 294 + (isRows ? Math.floor(row / 2) * 62 : row * 32),
  };
}

/**
 * Samples the ballot geometry from input and frame column width state for the
 * current authored frame.
 */
function _getBallotGeometryFromInputAndFrameColumnWidthState({
  input,
  frame,
  index,
  motion,
}: Readonly<ColumnWidthOptions>): ColumnWidthResult {
  const ballot = input.ballots[index];
  const columnWidth = 864 / (input.projects.length + 1);
  const isRows = input.tallyArrangement === "rows";
  const { targetX, targetY } = _getTallyTarget({ input, index, columnWidth });
  const sourceX = 60 + index * 106;
  const cast =
    ballot.projectId === null
      ? 0
      : motion.ramp(
          frame,
          40 + index * motion.scaleStagger(3),
          motion.scale(14),
          motion.travel.easing,
        );
  const lift =
    ballot.projectId === null
      ? 0
      : motion.ramp(
          frame,
          84 + index * motion.stagger.list,
          motion.whip,
          motion.travel.easing,
        );
  const unfold = motion.ramp(
    frame,
    112 + index * motion.stagger.list,
    motion.scale(10),
    motion.travel.easing,
  );
  return { columnWidth, isRows, targetX, targetY, sourceX, cast, lift, unfold };
}

/** Paper placement derives from the same authored ballot throughout travel. */
export function getBallotGeometryFromInputAndFrame({
  input,
  frame,
  index,
  motion,
}: BallotGeometryArgs): GetBallotGeometryResult {
  const { columnWidth, isRows, targetX, targetY, sourceX, cast, lift, unfold } =
    _getBallotGeometryFromInputAndFrameColumnWidthState({
      input,
      frame,
      index,
      motion,
    });
  return {
    x: Motion.mix({
      t: unfold,
      from: Motion.mix({
        t: cast,
        from: sourceX,
        to: 440 + index * 4,
      }),
      to: targetX,
    }),
    y: _getBallotGeometryFromInputAndFrameY({ targetY, cast, lift, unfold }),
    width: Motion.mix({
      t: unfold,
      from: 32,
      to: isRows ? columnWidth / 2 - 10 : columnWidth - 16,
    }),
    height: Motion.mix({
      t: unfold,
      from: 40,
      to: isRows ? 54 : 31,
    }),
    sourceX,
    cast,
    unfold,
  };
}
