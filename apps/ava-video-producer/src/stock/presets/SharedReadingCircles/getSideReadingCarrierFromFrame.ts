import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";

/** Data for getSideReadingCarrierFromFrame. */
type GetSideReadingCarrierResult = {
  x: number;
  y: number;
  bookX: number;
  bookY: number;
  reach: number;
  isCarrying: boolean;
  hasHand: boolean;
};

type LiftOptions = {
  tableX: Readonly<{
    frame: number;
    groupIndex: number;
    tableX: number;
    motion: VideoMotion;
  }>["tableX"];
  motion: Readonly<{
    frame: number;
    groupIndex: number;
    tableX: number;
    motion: VideoMotion;
  }>["motion"];
  elapsed: number;
  pickupY: number;
};

type LiftResult = {
  lift: number;
  travel: number;
  lower: number;
  settle: number;
  x: number;
  carriedY: number;
};

/**
 * Samples the side reading carrier from frame lift state for the current
 * authored frame.
 */
function _getSideReadingCarrierFromFrameLiftState({
  tableX,
  motion,
  elapsed,
  pickupY,
}: Readonly<LiftOptions>): LiftResult {
  const lift = motion.ramp(elapsed, 4, motion.scale(3), motion.travel.easing);
  const rise = motion.ramp(elapsed, 7, motion.scale(3), motion.travel.easing);
  const travel = motion.ramp(
    elapsed,
    10,
    motion.scale(10),
    motion.travel.easing,
  );
  const lower = motion.ramp(elapsed, 20, motion.scale(3), motion.travel.easing);
  const settle = motion.ramp(
    elapsed,
    23,
    motion.press.duration,
    motion.travel.easing,
  );
  const x = Motion.mix({
    t: travel,
    from: 45,
    to: tableX - 60,
  });
  const carriedY = Motion.mix({
    t: lower,
    from: Motion.mix({
      t: rise,
      from: pickupY,
      to: 210,
    }),
    to: 290,
  });
  return { lift, travel, lower, settle, x, carriedY };
}

/**
 * Clears the side shelf from top to bottom through one unoccupied upper lane.
 */
export function getSideReadingCarrierFromFrame({
  frame,
  groupIndex,
  tableX,
  motion,
}: Readonly<{
  frame: number;
  groupIndex: number;
  tableX: number;
  motion: VideoMotion;
}>): GetSideReadingCarrierResult {
  const elapsed = frame - (24 + groupIndex * 18);
  const pickupY = 210 + groupIndex * 55;
  const { lift, travel, lower, settle, x, carriedY } =
    _getSideReadingCarrierFromFrameLiftState({
      tableX,
      motion,
      elapsed,
      pickupY,
    });
  return {
    x,
    y: Motion.mix({
      t: settle,
      from: carriedY,
      to: 265,
    }),
    bookX: x + 60,
    bookY: carriedY + 40 * (1 - lift + lower),
    reach: motion.ramp(elapsed, 0, motion.press.duration, motion.travel.easing),
    isCarrying: elapsed >= 4 && elapsed <= 23,
    hasHand: elapsed >= 0 && elapsed <= 23,
  };
}
