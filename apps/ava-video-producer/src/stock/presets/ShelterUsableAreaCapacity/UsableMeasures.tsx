import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { getCapacityFromFloorTiles } from "./getCapacityFromFloorTiles";
import type { Input } from "./ShelterUsableAreaCapacity.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/**
 * Usable-area labels appear after the tiles have cleared their travel region.
 */
export function UsableMeasures({ input, frame }: Readonly<Props>): ReactNode {
  const { usable } = getCapacityFromFloorTiles(input);
  return (
    <g data-usable-measures="" opacity={ramp(frame, 108, 12)}>
      <LabelSlots
        labels={[
          [input.copy.usable, 60, 350, 330, 12, 3],
          [String(usable), 410, 350, 70, 14, 1],
          [input.copy.benchmark, 60, 445, 380, 12, 3],
          [String(input.illustrativeAreaPerPlace), 60, 498, 350, 16, 1],
          [input.copy.areaUnit, 60, 535, 380, 12, 3],
        ]}
      />
    </g>
  );
}
