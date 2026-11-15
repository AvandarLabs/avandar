import { getShelfUnitPoseFromInputAndFrame } from "./getShelfUnitPoseFromInputAndFrame";
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
}: Readonly<{ input: Input; frame: number }>): GetShelfUnitsResult[] {
  return input.goods.flatMap((good, goodIndex) =>
    Array.from(
      { length: good.openingUnits + good.incomingUnits },
      (_, unitIndex) => {
        const incomingIndex =
          input.goods
            .slice(0, goodIndex)
            .reduce((sum, item) => sum + item.incomingUnits, 0) +
          unitIndex -
          good.openingUnits;
        const selectedIndex =
          input.goods
            .slice(0, goodIndex)
            .reduce((sum, item) => sum + item.selectedUnits, 0) + unitIndex;
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
          }),
        };
      },
    ),
  );
}
