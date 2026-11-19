import { mix } from "../../../motion";
import { getQueueItemScheduleFromInput } from "./getQueueItemScheduleFromInput";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./QueueRelief.schema";
/** Data for getQueueItemLayoutFromInputAndFrame. */
type GetQueueItemLayoutResult = {
  x: number;
  y: number;
  state: string;
  serviceSlot: string | undefined;
  opacity: number;
};

/**
 * A single token moves from waiting to its bay and then to a stable tray slot.
 */
export function getQueueItemLayoutFromInputAndFrame({
  input,
  index,
  frame,
  motion,
}: Readonly<{
  input: Input;
  index: number;
  frame: number;
  motion: VideoMotion;
}>): GetQueueItemLayoutResult {
  const schedule = getQueueItemScheduleFromInput({ input, index });
  const enter = motion.ramp(frame, schedule.start, schedule.enterDuration);
  const exit = motion.ramp(
    frame,
    schedule.leave,
    schedule.finish - schedule.leave,
  );
  const waitY = 166 + schedule.waitingIndex * 50;
  const serviceY = 196 + schedule.slotIndex * 100;
  const state =
    frame < schedule.start
      ? schedule.isInitial
        ? "incoming"
        : "queued"
      : frame < schedule.start + schedule.enterDuration
        ? "entering"
        : frame < schedule.leave
          ? "service"
          : frame < schedule.finish
            ? "completing"
            : "completed";
  return {
    x: mix(exit, mix(enter, 48, 370), 680),
    y: mix(exit, mix(enter, waitY, serviceY), 166 + index * 48),
    state,
    serviceSlot:
      state === "entering" || state === "service"
        ? schedule.slot.id
        : undefined,
    opacity: motion.ramp(frame, 12 + index * 4, motion.whip),
  };
}
