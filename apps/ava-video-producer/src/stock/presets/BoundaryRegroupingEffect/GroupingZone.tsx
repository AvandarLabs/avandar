import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getGroupingFromCells } from "./getGroupingFromCells";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  zone: ReturnType<typeof getGroupingFromCells>[number];
  accent: string;
};
/** Matching visible keys attach each arithmetic summary to its zone seam. */
export function GroupingZone({ zone, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const cell = [...zone.cells].sort((first, second) => {
    return first.row - second.row || first.column - second.column;
  })[0];
  const color = [accent, tokens.color.accentAlt, tokens.color.highlight][
    zone.zoneIndex
  ];
  return (
    <g
      data-zone-summary={zone.id}
      data-records={zone.records}
      data-population={zone.population}
      data-value={zone.value}
    >
      <SketchedShape
        shape={{
          kind: "circle",
          cx: 70 + cell.column * 120,
          cy: 150 + cell.row * 110,
          r: 9,
        }}
        profile={tokens.sketch.shape}
        data-zone-key={zone.id}
        fill={tokens.color.elevated}
        stroke={color}
      />
      <LabelSlots labels={_buildZoneLabels({ zone, cell })} />
    </g>
  );
}
/** The zone key on its first cell and by its summary, then the summary. */
function _buildZoneLabels({
  zone,
  cell,
}: Readonly<{
  zone: Props["zone"];
  cell: Props["zone"]["cells"][number];
}>): ComponentProps<typeof LabelSlots>["labels"] {
  const summaryY = 160 + zone.zoneIndex * 108;
  const keyLabel = String(zone.zoneIndex + 1);
  return [
    [keyLabel, 66 + cell.column * 120, 154 + cell.row * 110, 16, 12, 1],
    [keyLabel, 480, summaryY, 24, 14, 1],
    [zone.label, 520, summaryY, 370, 14, 2],
    [`${zone.records} / ${zone.population}`, 520, summaryY + 44, 370, 16, 1],
    [String(zone.value), 520, summaryY + 71, 370, 18, 1],
  ];
}
