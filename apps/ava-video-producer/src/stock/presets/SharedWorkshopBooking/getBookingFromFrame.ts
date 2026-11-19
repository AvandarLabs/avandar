import { propEq, propNotEq } from "@avandar/utils";
import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./SharedWorkshopBooking.schema";

type Props = {
  input: Input;
  frame: number;
  index: number;
  motion: VideoMotion;
};
function _getUse({ input, frame, index, motion }: Readonly<Props>) {
  const bookings = input.requests
    .filter(propNotEq("agreedSlotId", null))
    .sort((first, second) => {
      return (
        input.timeSlots.findIndex(
          propEq<{ id: unknown }, "id", unknown>("id", first.agreedSlotId),
        ) -
        input.timeSlots.findIndex(
          propEq<{ id: unknown }, "id", unknown>("id", second.agreedSlotId),
        )
      );
    });
  const order = bookings.findIndex((item) => {
    return item.id === input.requests[index].id;
  });
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

/** Authored booking geometry preserves null and empty slot IDs distinctly. */
export function getBookingFromFrame({
  input,
  frame,
  index,
  motion,
}: Readonly<Props>): GetBookingFromFrameResult {
  const request = input.requests[index];
  const width = 540 / input.timeSlots.length;
  const requestedIndex = input.timeSlots.findIndex(
    propEq("id", request.requestedSlotId),
  );
  const agreedIndex = input.timeSlots.findIndex(
    propEq<{ id: unknown }, "id", unknown>("id", request.agreedSlotId),
  );
  const hasBooking = request.agreedSlotId !== null;
  const horizontal = hasBooking
    ? motion.ramp(frame, 36 + index * 3, motion.scale(30), motion.travel.easing)
    : 0;
  const vertical = hasBooking
    ? motion.ramp(frame, 75 + index * 3, motion.scale(24), motion.travel.easing)
    : 0;
  const x = mix(
    horizontal,
    390 + requestedIndex * width,
    390 + agreedIndex * width,
  );
  const y = mix(vertical, 170 + index * 66, 440);
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
