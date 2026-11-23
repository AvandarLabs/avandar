import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getKernelSamplesFromInput } from "../getKernelSamplesFromInput";
import { KernelCones } from "../KernelCones/KernelCones";
import { SourceMarkers } from "./SourceMarkers";
import type { Input } from "../KernelDensitySpread.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
const CELL_STROKE = 0.5;
/** Cone heights add into a fixed-scale sampled field beneath source markers. */
export function KernelField({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { color } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { radius, cells } = getKernelSamplesFromInput({ input, frame, motion });
  return (
    <g>
      {cells.map((cell) => {
        return (
          <StockRect
            key={`${cell.x}:${cell.y}`}
            data-cell-intensity={cell.intensity}
            x={180 + (cell.x - 50 / input.gridSize) * 2.8}
            y={200 + (cell.y - 50 / input.gridSize) * 2.8}
            width={280 / input.gridSize}
            height={280 / input.gridSize}
            stroke={color.line}
            strokeWidth={shapes.stroke(CELL_STROKE)}
            fill={accent}
            fillOpacity={shapes.wash(cell.intensity / input.legendMaximum)}
          />
        );
      })}
      <KernelCones input={input} frame={frame} accent={accent} />
      <SourceMarkers points={input.points} />
    </g>
  );
}
