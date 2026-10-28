import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { getCapacityFromFloorTiles } from "./getCapacityFromFloorTiles";
import type { Input } from "./ShelterUsableAreaCapacity.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/** The resolved area-only comparison keeps shortfall and spare separate. */
export function CapacitySummary({ input, frame }: Readonly<Props>): ReactNode {
  const values = getCapacityFromFloorTiles(input);
  return (
    <g data-capacity-summary="" opacity={ramp(frame, 108, 12)}>
      <LabelSlots
        labels={[
          [input.copy.capacity, 485, 326, 195, 12, 6],
          [String(values.equivalents), 485, 434, 195, 24, 1],
          [input.copy.demand, 710, 326, 200, 12, 6],
          [String(input.registeredPeople), 710, 434, 200, 24, 1],
          [input.copy.shortfall, 485, 450, 195, 12, 6],
          [String(values.shortfall), 485, 558, 195, 24, 1],
          [input.copy.spare, 710, 450, 200, 12, 6],
          [String(values.spare), 710, 558, 200, 24, 1],
        ]}
      />
    </g>
  );
}
