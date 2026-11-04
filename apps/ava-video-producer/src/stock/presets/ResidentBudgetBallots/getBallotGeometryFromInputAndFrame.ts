import { propEq } from "@avandar/utils";
import { mix, ramp, EASE } from "../../../motion";
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

/** Paper placement derives from the same authored ballot throughout travel. */
export function getBallotGeometryFromInputAndFrame({
  input,
  frame,
  index,
}: Readonly<{
  input: Input;
  frame: number;
  index: number;
}>): GetBallotGeometryResult {
  const ballot = input.ballots[index];
  const columnWidth = 864 / (input.projects.length + 1);
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
  const targetX =
    48 + column * columnWidth + (isRows ? (row % 2) * (columnWidth / 2) : 0);
  const targetY = 294 + (isRows ? Math.floor(row / 2) * 62 : row * 32);
  const sourceX = 60 + index * 106;
  const cast =
    ballot.projectId === null ? 0 : ramp(frame, 40 + index * 3, 14, EASE.inOut);
  const lift =
    ballot.projectId === null ? 0 : ramp(frame, 84 + index * 2, 8, EASE.inOut);
  const unfold = ramp(frame, 112 + index * 2, 10, EASE.inOut);
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
