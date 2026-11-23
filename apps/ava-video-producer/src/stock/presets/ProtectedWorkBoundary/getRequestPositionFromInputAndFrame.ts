import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./ProtectedWorkBoundary.schema";

/** Data for getRequestPositionFromInputAndFrame. */
type GetRequestPositionResult = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type RequestPositionArgs = Readonly<{
  frame: number;
  input: Input;
  motion: VideoMotion;
}>;

type WidthOptions = {
  frame: RequestPositionArgs["frame"];
  input: RequestPositionArgs["input"];
  motion: RequestPositionArgs["motion"];
};

type WidthResult = {
  width: number;
  requested: number;
  destination: number | number;
  approach: number;
  lift: number;
};

/** The left edge of a slot's request card. */
function _getSlotX({
  input,
  slotIndex,
}: Readonly<{
  input: Input;
  slotIndex: number;
}>): number {
  return 50 + (slotIndex * 860) / input.slots.length + 2;
}

/**
 * Samples the request position from input and frame width state for the current
 * authored frame.
 */
function _getRequestPositionFromInputAndFrameWidthState({
  frame,
  input,
  motion,
}: Readonly<WidthOptions>): WidthResult {
  const width = 860 / input.slots.length - 4;
  const requested = _getSlotX({
    input,
    slotIndex: input.slots.findIndex(
      propEq("id", input.request.requestedSlotId),
    ),
  });
  const destination =
    input.request.placement === "defer"
      ? 660
      : _getSlotX({
          input,
          slotIndex: input.slots.findIndex(
            propEq<
              {
                id: unknown;
              },
              "id",
              unknown
            >("id", input.request.agreedSlotId),
          ),
        });
  const approach = motion.ramp(
      frame,
      39,
      motion.scale(21),
      motion.travel.easing,
    ),
    lift = motion.ramp(frame, 60, motion.scale(16), motion.travel.easing);
  return { width, requested, destination, approach, lift };
}

/**
 * Request travels above protected time before landing at its authored target.
 */
export function getRequestPositionFromInputAndFrame({
  frame,
  input,
  motion,
}: RequestPositionArgs): GetRequestPositionResult {
  const { width, requested, destination, approach, lift } =
    _getRequestPositionFromInputAndFrameWidthState({ frame, input, motion });
  const travel = motion.ramp(frame, 77, motion.scale(28), motion.travel.easing),
    land = motion.ramp(frame, 105, motion.scale(25), motion.travel.easing);
  return {
    x: Motion.mix({
      t: travel,
      from: Motion.mix({
        t: approach,
        from: 270,
        to: requested,
      }),
      to: destination,
    }),
    y: Motion.mix({
      t: land,
      from: Motion.mix({
        t: lift,
        from: 90,
        to: 60,
      }),
      to: input.request.placement === "defer" ? 85 : 400,
    }),
    width: Math.min(width, 240),
    height: 90,
  };
}
