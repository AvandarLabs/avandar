import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./RetailShelfReplenishment.schema";

type Unit = {
  goodIndex: number;
  unitIndex: number;
  incomingIndex: number;
  selectedIndex: number;
  input: Input;
  frame: number;
  motion: VideoMotion;
};
/** One conserved physical unit's position, owner and handling actor. */
export function getShelfUnitPoseFromInputAndFrame({
  goodIndex,
  unitIndex,
  incomingIndex,
  selectedIndex,
  input,
  frame,
  motion,
}: Readonly<Unit>): { owner: string; x: number; y: number } {
  const good = input.goods[goodIndex];
  const shelf = { x: 180 + unitIndex * 56, y: 200 + goodIndex * 105 };
  const arrival = motion.ramp(frame, 38, motion.hero, motion.travel.easing);
  const trolley = {
    x: 698 + (incomingIndex % 3) * 36 + mix(arrival, 100, 0),
    y: 370 + Math.floor(incomingIndex / 3) * 36,
  };
  const load = motion.ramp(
    frame,
    58 + incomingIndex * motion.scaleStagger(5),
    motion.scale(5),
    motion.travel.easing,
  );
  const purchase = motion.ramp(
    frame,
    96 + selectedIndex * motion.scaleStagger(8),
    motion.whip,
    motion.travel.easing,
  );
  const isIncoming = unitIndex >= good.openingUnits;
  const isSelected = unitIndex < good.selectedUnits;
  const restocked = isIncoming
    ? {
        x: mix(load, trolley.x, shelf.x),
        y: mix(load, trolley.y, shelf.y) - Math.sin(load * Math.PI) * 28,
      }
    : shelf;
  const position = isSelected
    ? {
        x: mix(purchase, restocked.x, 720 + selectedIndex * 40),
        y: mix(purchase, restocked.y, 476) - Math.sin(purchase * Math.PI) * 24,
      }
    : restocked;
  const owner =
    isSelected && purchase > 0
      ? purchase === 1
        ? "basket"
        : "shopper-hand"
      : isIncoming && load < 1
        ? load === 0
          ? "trolley"
          : "retailer-hand"
        : "shelf";
  return { ...position, owner };
}
