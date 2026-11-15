import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { CapacitySummary } from "./CapacitySummary";
import { getCapacityFromFloorTiles } from "./getCapacityFromFloorTiles";
import { ShelterRoleLegend } from "./ShelterRoleLegend";
import { UsableMeasures } from "./UsableMeasures";
import type { Input } from "./ShelterUsableAreaCapacity.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Role areas remain visible while usable measures and capacity resolve. */
export function ShelterAccounting({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const { gross } = getCapacityFromFloorTiles(input);
  return (
    <g>
      <ShelterRoleLegend input={input} />
      <LabelSlots
        labels={[
          [input.copy.gross, 60, 80, 330, 12, 3],
          [String(gross), 410, 80, 70, 14, 1],
        ]}
      />
      <UsableMeasures input={input} frame={frame} />
      <CapacitySummary input={input} frame={frame} />
    </g>
  );
}
