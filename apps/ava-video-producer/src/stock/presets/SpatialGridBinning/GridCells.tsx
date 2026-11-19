import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { GridCell } from "./GridCell";
import { makeGridSceneFromInputAndFrame } from "./makeGridSceneFromInputAndFrame";
import type { Input } from "./SpatialGridBinning.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

const OUTLINE_AT = 13;
const OUTLINE_FRAMES = 37;
const SHADE_AT = 111;
const SHADE_FRAMES = 28;
const SHADE_FLOOR = 0.04;
const SHADE_RANGE = 0.36;
/** Square source bins and a separate count-token ledger. */
export function GridCells({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { color, stroke } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const { cells } = makeGridSceneFromInputAndFrame({
    input,
    frame,
    motion,
  });
  const { columns, rows } = input.grid;
  return (
    <g>
      {cells.map((cell) => {
        return (
          <g key={cell.index}>
            <StockRect
              data-cell-shade={cell.index}
              x={48 + (cell.column * 330) / columns}
              y={164 + (cell.row * 330) / rows}
              width={330 / columns}
              height={330 / rows}
              fill={accent}
              fillOpacity={shapes.wash(
                motion.ramp(frame, SHADE_AT, motion.scale(SHADE_FRAMES)) *
                  (SHADE_FLOOR +
                    (cell.count / input.points.length) * SHADE_RANGE),
              )}
              stroke={color.line}
              strokeOpacity={motion.ramp(
                frame,
                OUTLINE_AT,
                motion.scale(OUTLINE_FRAMES),
              )}
              strokeWidth={shapes.stroke(stroke.hairline)}
            />
            <GridCell input={input} cell={cell} frame={frame} />
          </g>
        );
      })}
    </g>
  );
}
