import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { buildZoneOutlineFromCells } from "../buildZoneOutlineFromCells";
import { getGroupingFromCells } from "../getGroupingFromCells";
import type { Input } from "../BoundaryRegroupingEffect.schema";
import type { ReactNode } from "react";
/** The outline of every zone in one grouping of the grid. */
export function PartitionOutlines({
  input,
  index,
  accent,
}: Readonly<{ input: Input; index: number; accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return getGroupingFromCells({ input, index }).map((zone) => {
    return (
      <SketchedShape
        key={zone.id}
        shape={{ kind: "path", d: buildZoneOutlineFromCells(zone.cells) }}
        profile={tokens.sketch.shape}
        data-zone-outline={zone.id}
        fill="none"
        stroke={
          [accent, tokens.color.accentAlt, tokens.color.highlight][
            zone.zoneIndex
          ]
        }
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
    );
  });
}
