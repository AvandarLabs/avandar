import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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
  motion,
}: Readonly<{
  input: Input;
  index: number;
  frame: number;
  motion: VideoMotion;
}>): GetTeamMarkerPoseResult {
  const team = input.teams[index];
  const origin = input.places.find(propEq("id", team.initialPlaceId))!;
  const destination = input.places.find(propEq("id", team.agreedPlaceId))!;
  const moved = team.initialPlaceId !== team.agreedPlaceId;
  const progress = moved
    ? motion.ramp(frame, 56, motion.scale(32), motion.travel.easing)
    : 0;
  const lift = moved
    ? 36 *
      (motion.ramp(frame, 44, motion.scale(12), motion.travel.easing) -
        motion.ramp(frame, 88, motion.scale(12), motion.travel.easing))
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
