import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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
/** Where a ballot lands in its project's tally, in rows or a column. */
function _getTallyTarget({
  input,
  index,
  columnWidth,
}: Readonly<{ input: Input; index: number; columnWidth: number }>) {
  const ballot = input.ballots[index];
  const column =
    ballot.projectId === null
      ? input.projects.length
      : input.projects.findIndex(
          propEq<{ id: unknown }, "id", unknown>("id", ballot.projectId),
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
/** Paper placement derives from the same authored ballot throughout travel. */
export function getBallotGeometryFromInputAndFrame({
  input,
  frame,
  index,
  motion,
}: BallotGeometryArgs): GetBallotGeometryResult {
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
  return {
    x: mix(unfold, mix(cast, sourceX, 440 + index * 4), targetX),
    y: mix(unfold, mix(lift, mix(cast, 118, 264), 206), targetY),
    width: mix(unfold, 32, isRows ? columnWidth / 2 - 10 : columnWidth - 16),
    height: mix(unfold, 40, isRows ? 54 : 31),
    sourceX,
    cast,
    unfold,
  };
}
