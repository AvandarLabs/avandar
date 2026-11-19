import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./ProtectedWorkBoundary.schema";
/** Data for getRequestPositionFromInputAndFrame. */
type GetRequestPositionResult = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Request travels above protected time before landing at its authored target.
 */
export function getRequestPositionFromInputAndFrame({
  frame,
  input,
  motion,
}: Readonly<{
  frame: number;
  input: Input;
  motion: VideoMotion;
}>): GetRequestPositionResult {
  const width = 860 / input.slots.length - 4;
  const requested =
    50 +
    (input.slots.findIndex(propEq("id", input.request.requestedSlotId)) * 860) /
      input.slots.length +
    2;
  const destination =
    input.request.placement === "defer"
      ? 660
      : 50 +
        (input.slots.findIndex(
          propEq<{ id: unknown }, "id", unknown>(
            "id",
            input.request.agreedSlotId,
          ),
        ) *
          860) /
          input.slots.length +
        2;
  const approach = motion.ramp(
      frame,
      39,
      motion.scale(21),
      motion.travel.easing,
    ),
    lift = motion.ramp(frame, 60, motion.scale(16), motion.travel.easing);
  const travel = motion.ramp(frame, 77, motion.scale(28), motion.travel.easing),
    land = motion.ramp(frame, 105, motion.scale(25), motion.travel.easing);
  return {
    x: mix(travel, mix(approach, 270, requested), destination),
    y: mix(
      land,
      mix(lift, 90, 60),
      input.request.placement === "defer" ? 85 : 400,
    ),
    width: Math.min(width, 240),
    height: 90,
  };
}
