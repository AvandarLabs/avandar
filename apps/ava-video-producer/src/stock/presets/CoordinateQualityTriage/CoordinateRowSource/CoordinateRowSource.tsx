import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./CoordinateRowSourceShared.types";
import { RowKey } from "./RowKey";
import type { ReactNode } from "react";
/**
 * Fixed source identities reserve three lines for each escaped JSON literal.
 */
export function CoordinateRowSource({
  row,
  showValues,
}: Readonly<Props>): ReactNode {
  const { color, stroke, sketch, text } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const hairline = shapes.stroke(stroke.hairline);
  const data = text.graphic.data;
  const y = 132 + row.index * 69;
  return (
    <g data-reason={row.reason}>
      <SketchedShape
        shape={{ kind: "path", d: `M475 ${y - 10} H920` }}
        profile={sketch.shape}
        stroke={color.line}
        strokeWidth={hairline}
      />
      <RowKey row={row} y={y} />
      {row.reason === "plotted" ? (
        <text
          data-plotted-key-reference={row.representativeIndex + 1}
          x={472}
          y={y + 4}
          fontFamily={data.fontFamily}
          fontWeight={data.fontWeight}
          fontSize={data.fontSize}
          fill={data.color}
        >{`→${row.representativeIndex + 1}`}</text>
      ) : undefined}
      <LabelSlots labels={[[row.id, 510, y + 4, 410, 12, 1]]} />
      {showValues ? (
        <g data-coordinate-value={row.id}>
          <LabelSlots
            labels={[
              [JSON.stringify(row.latitude), 480, y + 22, 210, 12, 3],
              [JSON.stringify(row.longitude), 710, y + 22, 210, 12, 3],
            ]}
          />
        </g>
      ) : undefined}
    </g>
  );
}
