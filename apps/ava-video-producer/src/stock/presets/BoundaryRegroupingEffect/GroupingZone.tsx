import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getGroupingFromCells } from "./getGroupingFromCells";
import type { ReactNode } from "react";
type Props = {
  zone: ReturnType<typeof getGroupingFromCells>[number];
  accent: string;
};
/** Matching visible keys attach each arithmetic summary to its zone seam. */
export function GroupingZone({ zone, accent }: Readonly<Props>): ReactNode {
  const cell = [...zone.cells].sort(
    (first, second) => first.row - second.row || first.column - second.column,
  )[0];
  const color = [accent, STOCK.cyan, STOCK.orange][zone.zoneIndex];
  const summaryY = 160 + zone.zoneIndex * 108;
  const keyLabel = String(zone.zoneIndex + 1);
  return (
    <g
      data-zone-summary={zone.id}
      data-records={zone.records}
      data-population={zone.population}
      data-value={zone.value}
    >
      <circle
        data-zone-key={zone.id}
        cx={70 + cell.column * 120}
        cy={150 + cell.row * 110}
        r={9}
        fill={STOCK.elevated}
        stroke={color}
      />
      <LabelSlots
        labels={[
          [keyLabel, 66 + cell.column * 120, 154 + cell.row * 110, 16, 12, 1],
          [keyLabel, 480, summaryY, 24, 14, 1],
          [zone.label, 520, summaryY, 370, 14, 2],
          [
            `${zone.records} / ${zone.population}`,
            520,
            summaryY + 44,
            370,
            16,
            1,
          ],
          [String(zone.value), 520, summaryY + 71, 370, 18, 1],
        ]}
      />
    </g>
  );
}
