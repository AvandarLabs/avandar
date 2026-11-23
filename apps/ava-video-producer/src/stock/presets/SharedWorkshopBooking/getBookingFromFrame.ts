import { propEq, propNotEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./SharedWorkshopBooking.schema";

type Props = {
  input: Input;
  frame: number;
  index: number;
  motion: VideoMotion;
};

type RequestedIndexOptions = {
  input: Readonly<Props>["input"];
  frame: Readonly<Props>["frame"];
  index: Readonly<Props>["index"];
  motion: Readonly<Props>["motion"];
  request: Readonly<Props>["input"]["requests"][number];
  width: number;
};

type RequestedIndexResult = {
  requestedIndex: number;
  hasBooking: boolean;
  vertical: ReturnType<typeof _getBookingTravel>["vertical"];
  x: number;
  y: number;
};

/** Data for getBookingFromFrame. */
type GetBookingFromFrameResult = {
  x: number;
  y: number;
  width: number;
  requestedX: number;
  requestedY: number;
  hasBooking: boolean;
  vertical: number;
  use: number;
};

/** A booked request's move across to its agreed slot, then down, 0 to 1. */
function _getBookingTravel({
  hasBooking,
  frame,
  index,
  motion,
}: Readonly<
  Omit<Props, "input"> & {
    hasBooking: boolean;
  }
>) {
  if (!hasBooking) {
    return { horizontal: 0, vertical: 0 };
  }
  return {
    horizontal: motion.ramp(
      frame,
      36 + index * motion.scaleStagger(3),
      motion.scale(30),
      motion.travel.easing,
    ),
    vertical: motion.ramp(
      frame,
      75 + index * motion.scaleStagger(3),
      motion.scale(24),
      motion.travel.easing,
    ),
  };
}

/**
 * Samples the booking from frame requested index state for the current authored
 * frame.
 */
function _getBookingFromFrameRequestedIndexState({
  input,
  frame,
  index,
  motion,
  request,
  width,
}: Readonly<RequestedIndexOptions>): RequestedIndexResult {
  const requestedIndex = input.timeSlots.findIndex(
    propEq("id", request.requestedSlotId),
  );
  const agreedIndex = input.timeSlots.findIndex(
    propEq<
      {
        id: unknown;
      },
      "id",
      unknown
    >("id", request.agreedSlotId),
  );
  const hasBooking = request.agreedSlotId !== null;
  const { horizontal, vertical } = _getBookingTravel({
    hasBooking,
    frame,
    index,
    motion,
  });
  const x = Motion.mix({
    t: horizontal,
    from: 390 + requestedIndex * width,
    to: 390 + agreedIndex * width,
  });
  const y = Motion.mix({
    t: vertical,
    from: 170 + index * 66,
    to: 440,
  });
  return { requestedIndex, hasBooking, vertical, x, y };
}

function _getUse({ input, frame, index, motion }: Readonly<Props>) {
  const bookings = input.requests
    .filter(propNotEq("agreedSlotId", null))
    .sort((first, second) => {
      return (
        input.timeSlots.findIndex(
          propEq<
            {
              id: unknown;
            },
            "id",
            unknown
          >("id", first.agreedSlotId),
        ) -
        input.timeSlots.findIndex(
          propEq<
            {
              id: unknown;
            },
            "id",
            unknown
          >("id", second.agreedSlotId),
        )
      );
    });
  const order = bookings.findIndex(propEq("id", input.requests[index].id));
  const duration = 44 / Math.max(bookings.length, 1);
  const turnAt = 108 + order * duration;
  const use =
    input.showUsageTurns && input.requests[index].agreedSlotId !== null
      ? motion.ramp(frame, turnAt, motion.scale(5), motion.travel.easing) *
        (1 -
          motion.ramp(
            frame,
            turnAt + duration - 5,
            motion.scale(5),
            motion.travel.easing,
          ))
      : 0;
  return use;
}

/** Authored booking geometry preserves null and empty slot IDs distinctly. */
export function getBookingFromFrame({
  input,
  frame,
  index,
  motion,
}: Readonly<Props>): GetBookingFromFrameResult {
  const request = input.requests[index];
  const width = 540 / input.timeSlots.length;
  const { requestedIndex, hasBooking, vertical, x, y } =
    _getBookingFromFrameRequestedIndexState({
      input,
      frame,
      index,
      motion,
      request,
      width,
    });
  const use = _getUse({ input, frame, index, motion });
  return {
    x,
    y,
    width: width - 12,
    requestedX: 390 + requestedIndex * width,
    requestedY: 170 + index * 66,
    hasBooking,
    vertical,
    use,
  };
}
