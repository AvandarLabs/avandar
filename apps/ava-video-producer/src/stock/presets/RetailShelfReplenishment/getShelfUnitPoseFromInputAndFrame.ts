import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./RetailShelfReplenishment.schema";
type Unit = {
  goodIndex: number;
  unitIndex: number;
  incomingIndex: number;
  selectedIndex: number;
  input: Input;
  frame: number;
};
/** One conserved physical unit's position, owner and handling actor. */
export function getShelfUnitPoseFromInputAndFrame({
  goodIndex,
  unitIndex,
  incomingIndex,
  selectedIndex,
  input,
  frame,
}: Readonly<Unit>): { owner: string; x: number; y: number } {
  const good = input.goods[goodIndex];
  const shelf = { x: 180 + unitIndex * 56, y: 200 + goodIndex * 105 };
  const arrival = ramp(frame, 38, 18, EASE.inOut);
  const trolley = {
    x: 698 + (incomingIndex % 3) * 36 + mix(arrival, 100, 0),
    y: 370 + Math.floor(incomingIndex / 3) * 36,
  };
  const load = ramp(frame, 58 + incomingIndex * 5, 5, EASE.inOut);
  const purchase = ramp(frame, 96 + selectedIndex * 8, 8, EASE.inOut);
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
