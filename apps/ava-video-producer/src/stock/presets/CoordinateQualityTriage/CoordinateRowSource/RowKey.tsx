import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props as CoordinateRowSourceSharedProps } from "./CoordinateRowSourceShared.types";
import type { ReactNode } from "react";

type Props = { row: CoordinateRowSourceSharedProps["row"]; y: number };

/** The row's number in a ring at the head of its line. */
export function RowKey({ row, y }: Readonly<Props>): ReactNode {
  const { color, stroke, sketch, text } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const data = text.graphic.data;
  return (
    <>
      <SketchedShape
        shape={{ kind: "circle", cx: 450, cy: y, r: 9 }}
        profile={sketch.shape}
        fill={color.surface}
        stroke={color.inactive}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <text
        data-row-key={row.id}
        aria-label={String(row.index + 1)}
        x={450}
        y={y + 4}
        fontFamily={data.fontFamily}
        fontWeight={data.fontWeight}
        fontSize={data.fontSize}
        fill={data.color}
        textAnchor="middle"
      >
        {row.index + 1}
      </text>
    </>
  );
}
