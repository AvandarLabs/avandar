import { Motion } from "../../../motion";
import { getQueueItemScheduleFromInput } from "./getQueueItemScheduleFromInput";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./QueueRelief.schema";

/** Data for getQueueItemLayoutFromInputAndFrame. */
type GetQueueItemLayoutResult = {
  x: number;
  y: number;
  state: string;
  serviceSlot: string | undefined;
  opacity: number;
};

type QueueItemLayoutArgs = Readonly<{
  input: Input;
  index: number;
  frame: number;
  motion: VideoMotion;
}>;

type ScheduleOptions = {
  input: QueueItemLayoutArgs["input"];
  index: QueueItemLayoutArgs["index"];
  frame: QueueItemLayoutArgs["frame"];
  motion: QueueItemLayoutArgs["motion"];
};

type ScheduleResult = {
  schedule: ReturnType<typeof getQueueItemScheduleFromInput>;
  enter: number;
  exit: number;
  waitY: number;
  serviceY: number;
  state: string;
};

/** Where an item is in its journey from the queue through service. */
function _getQueueState({
  frame,
  schedule,
}: Readonly<{
  frame: number;
  schedule: ReturnType<typeof getQueueItemScheduleFromInput>;
}>): string {
  return frame < schedule.start
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
}

/**
 * Samples the queue item layout from input and frame schedule state for the
 * current authored frame.
 */
function _getQueueItemLayoutFromInputAndFrameScheduleState({
  input,
  index,
  frame,
  motion,
}: Readonly<ScheduleOptions>): ScheduleResult {
  const schedule = getQueueItemScheduleFromInput({ input, index });
  const enter = motion.ramp(frame, schedule.start, schedule.enterDuration);
  const exit = motion.ramp(
    frame,
    schedule.leave,
    schedule.finish - schedule.leave,
  );
  const waitY = 166 + schedule.waitingIndex * 50;
  const serviceY = 196 + schedule.slotIndex * 100;
  const state = _getQueueState({ frame, schedule });
  return { schedule, enter, exit, waitY, serviceY, state };
}

/**
 * A single token moves from waiting to its bay and then to a stable tray slot.
 */
export function getQueueItemLayoutFromInputAndFrame({
  input,
  index,
  frame,
  motion,
}: QueueItemLayoutArgs): GetQueueItemLayoutResult {
  const { schedule, enter, exit, waitY, serviceY, state } =
    _getQueueItemLayoutFromInputAndFrameScheduleState({
      input,
      index,
      frame,
      motion,
    });
  return {
    x: Motion.mix({
      t: exit,
      from: Motion.mix({
        t: enter,
        from: 48,
        to: 370,
      }),
      to: 680,
    }),
    y: Motion.mix({
      t: exit,
      from: Motion.mix({
        t: enter,
        from: waitY,
        to: serviceY,
      }),
      to: 166 + index * 48,
    }),
    state,
    serviceSlot:
      state === "entering" || state === "service"
        ? schedule.slot.id
        : undefined,
    opacity: motion.ramp(
      frame,
      12 + index * motion.scaleStagger(4),
      motion.whip,
    ),
  };
}
