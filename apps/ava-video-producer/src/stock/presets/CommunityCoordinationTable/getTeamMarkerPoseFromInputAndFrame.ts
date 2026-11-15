import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./CommunityCoordinationTable.schema";
/** Data for getTeamMarkerPoseFromInputAndFrame. */
type GetTeamMarkerPoseResult = {
  x: number;
  y: number;
  moved: boolean;
  lift: number;
};

/** The sole reassigned team lifts, carries and replaces its own marker. */
export function getTeamMarkerPoseFromInputAndFrame({
  input,
  index,
  frame,
}: Readonly<{
  input: Input;
  index: number;
  frame: number;
}>): GetTeamMarkerPoseResult {
  const team = input.teams[index];
  const origin = input.places.find(propEq("id", team.initialPlaceId))!;
  const destination = input.places.find(propEq("id", team.agreedPlaceId))!;
  const moved = team.initialPlaceId !== team.agreedPlaceId;
  const progress = moved ? ramp(frame, 56, 32, EASE.inOut) : 0;
  const lift = moved
    ? 36 * (ramp(frame, 44, 12, EASE.inOut) - ramp(frame, 88, 12, EASE.inOut))
    : 0;
  // Every complete cluster, including strokes, fits a 33 by 41 cage.
  // Its diagonal is <54, the minimum distance between any two map places.
  return {
    x:
      340 +
      mix(progress, origin.x, destination.x) * 270 +
      (index % 2 === 0 ? -8.5 : 8.5),
    y:
      160 +
      mix(progress, origin.y, destination.y) * 280 +
      (index < 2 ? -10.5 : 10.5) -
      lift,
    moved,
    lift,
  };
}
