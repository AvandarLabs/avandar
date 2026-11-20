import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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
  const x = mix(travel, 45, tableX - 60);
  const carriedY = mix(lower, mix(rise, pickupY, 210), 290);
  return {
    x,
    y: mix(settle, carriedY, 265),
    bookX: x + 60,
    bookY: carriedY + 40 * (1 - lift + lower),
    reach: motion.ramp(elapsed, 0, motion.press.duration, motion.travel.easing),
    isCarrying: elapsed >= 4 && elapsed <= 23,
    hasHand: elapsed >= 0 && elapsed <= 23,
  };
}
