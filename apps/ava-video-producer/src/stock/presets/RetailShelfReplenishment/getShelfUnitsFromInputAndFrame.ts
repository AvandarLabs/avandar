import { getShelfUnitPoseFromInputAndFrame } from "./getShelfUnitPoseFromInputAndFrame";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./RetailShelfReplenishment.schema";
/** Data for getShelfUnitsFromInputAndFrame. */
type GetShelfUnitsResult = {
  owner: string;
  x: number;
  y: number;
  good: {
    id: string;
    label: string;
    symbol: "grain" | "beans" | "vegetables";
    openingUnits: number;
    incomingUnits: number;
    selectedUnits: number;
  };
  unitIndex: number;
};

/** All authored units receive one deterministic physical pose and owner. */
export function getShelfUnitsFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  motion: VideoMotion;
}>): GetShelfUnitsResult[] {
  return input.goods.flatMap((good, goodIndex) => {
    return Array.from(
      { length: good.openingUnits + good.incomingUnits },
      (_, unitIndex) => {
        const incomingIndex =
          input.goods.slice(0, goodIndex).reduce((sum, item) => {
            return sum + item.incomingUnits;
          }, 0) +
          unitIndex -
          good.openingUnits;
        const selectedIndex =
          input.goods.slice(0, goodIndex).reduce((sum, item) => {
            return sum + item.selectedUnits;
          }, 0) + unitIndex;
        return {
          good,
          unitIndex,
          ...getShelfUnitPoseFromInputAndFrame({
            input,
            frame,
            goodIndex,
            unitIndex,
            incomingIndex,
            selectedIndex,
            motion,
          }),
        };
      },
    );
  });
}
