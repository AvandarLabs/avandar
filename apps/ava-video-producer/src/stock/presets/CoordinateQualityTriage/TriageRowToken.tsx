import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  row: ReturnType<typeof makeCoordinateTriageFromInputAndFrame>["rows"][number];
  frame: number;
  accent: string;
};
/** Coincident copies yield to the indexed representative and source keys. */
export function TriageRowToken({
  row,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { color, stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const opacity =
    row.reason === "plotted" && row.representativeIndex !== row.index
      ? 1 - motion.ramp(frame, row.arrivedAt, motion.chip)
      : 1;
  return (
    <g data-moving-row-key={row.id} opacity={opacity}>
      <SketchedShape
        data-row-token={row.id}
        shape={{ kind: "circle", cx: row.x, cy: row.y, r: 9 }}
        profile={sketch.shape}
        fill={color.surface}
        stroke={row.reason === "plotted" ? accent : color.highlight}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <Text role="data" x={row.x} y={row.y + 4} anchor="middle">
        {row.index + 1}
      </Text>
    </g>
  );
}
