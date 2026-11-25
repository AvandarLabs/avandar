import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { makeGridSceneFromInputAndFrame } from "../makeGridSceneFromInputAndFrame";
import { GridCellsShared } from "./GridCellsShared";
import type { Input } from "../SpatialGridBinning.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  cell: ReturnType<typeof makeGridSceneFromInputAndFrame>["cells"][number];
  frame: number;
  accent: string;
};
/** A bin, shaded by its share of the points once they are counted. */
export function CellShade({
  input,
  cell,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { color, stroke } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { columns, rows } = input.grid;
  return (
    <StockRect
      data-cell-shade={cell.index}
      x={48 + (cell.column * 330) / columns}
      y={164 + (cell.row * 330) / rows}
      width={330 / columns}
      height={330 / rows}
      fill={accent}
      fillOpacity={shapes.wash(
        motion.ramp(
          frame,
          GridCellsShared.SHADE_AT,
          motion.scale(GridCellsShared.SHADE_FRAMES),
        ) *
          (GridCellsShared.SHADE_FLOOR +
            (cell.count / input.points.length) * GridCellsShared.SHADE_RANGE),
      )}
      stroke={color.line}
      strokeOpacity={motion.ramp(
        frame,
        GridCellsShared.OUTLINE_AT,
        motion.scale(GridCellsShared.OUTLINE_FRAMES),
      )}
      strokeWidth={shapes.stroke(stroke.hairline)}
    />
  );
}
