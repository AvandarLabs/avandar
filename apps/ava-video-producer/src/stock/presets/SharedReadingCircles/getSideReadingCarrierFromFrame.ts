import { EASE, mix, ramp } from "../../../motion";
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
}: Readonly<{
  frame: number;
  groupIndex: number;
  tableX: number;
}>): GetSideReadingCarrierResult {
  const elapsed = frame - (24 + groupIndex * 18);
  const pickupY = 210 + groupIndex * 55;
  const lift = ramp(elapsed, 4, 3, EASE.inOut);
  const rise = ramp(elapsed, 7, 3, EASE.inOut);
  const travel = ramp(elapsed, 10, 10, EASE.inOut);
  const lower = ramp(elapsed, 20, 3, EASE.inOut);
  const settle = ramp(elapsed, 23, 4, EASE.inOut);
  const x = mix(travel, 45, tableX - 60);
  const carriedY = mix(lower, mix(rise, pickupY, 210), 290);
  return {
    x,
    y: mix(settle, carriedY, 265),
    bookX: x + 60,
    bookY: carriedY + 40 * (1 - lift + lower),
    reach: ramp(elapsed, 0, 4, EASE.inOut),
    isCarrying: elapsed >= 4 && elapsed <= 23,
    hasHand: elapsed >= 0 && elapsed <= 23,
  };
}
