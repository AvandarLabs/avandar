import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  row: ReturnType<typeof makeCoordinateTriageFromInputAndFrame>["rows"][number];
  showValues: boolean;
};
/**
 * Fixed source identities reserve three lines for each escaped JSON literal.
 */
export function CoordinateRowSource({
  row,
  showValues,
}: Readonly<Props>): ReactNode {
  const { color, stroke, sketch, text } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
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
      <SketchedShape
        shape={{ kind: "circle", cx: 450, cy: y, r: 9 }}
        profile={sketch.shape}
        fill={color.surface}
        stroke={color.inactive}
        strokeWidth={hairline}
      />
      <text
        data-row-key={row.id}
        aria-label={String(row.index + 1)}
        x={450}
        y={y + 4}
        fontFamily={data.fontFamily}
        fontSize={data.fontSize}
        fill={data.color}
        textAnchor="middle"
      >
        {row.index + 1}
      </text>
      {row.reason === "plotted" ? (
        <text
          data-plotted-key-reference={row.representativeIndex + 1}
          x={472}
          y={y + 4}
          fontFamily={data.fontFamily}
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
