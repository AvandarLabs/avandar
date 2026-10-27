import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { getCapacityFromFloorTiles } from "./getCapacityFromFloorTiles";
import type { Input } from "./ShelterUsableAreaCapacity.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Every role is keyed to its floor geometry and exact area contribution. */
export function ShelterRoleLegend({ input }: Readonly<Props>): ReactNode {
  const { roleAreas } = getCapacityFromFloorTiles(input);
  return (
    <g>
      {(["sleeping", "circulation", "storage", "closed"] as const).map(
        (role, index) => (
          <LabelSlots
            key={role}
            labels={[
              [String(index + 1), 480, 80 + index * 60, 24, 12, 1],
              [input.copy[role], 515, 80 + index * 60, 310, 12, 4],
              [String(roleAreas[role]), 850, 80 + index * 60, 70, 14, 1],
            ]}
          />
        ),
      )}
    </g>
  );
}
