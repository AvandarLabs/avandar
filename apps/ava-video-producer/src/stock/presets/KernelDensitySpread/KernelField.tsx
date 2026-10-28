import { STOCK } from "../../stockPalette";
import { getKernelSamplesFromInput } from "./getKernelSamplesFromInput";
import { KernelCones } from "./KernelCones";
import type { Input } from "./KernelDensitySpread.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Cone heights add into a fixed-scale sampled field beneath source markers. */
export function KernelField({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { radius, cells } = getKernelSamplesFromInput({ input, frame });
  return (
    <g>
      {cells.map((cell, index) => (
        <rect
          key={index}
          data-cell-intensity={cell.intensity}
          x={180 + (cell.x - 50 / input.gridSize) * 2.8}
          y={200 + (cell.y - 50 / input.gridSize) * 2.8}
          width={280 / input.gridSize}
          height={280 / input.gridSize}
          stroke={STOCK.line}
          strokeWidth={0.5}
          fill={accent}
          fillOpacity={cell.intensity / input.legendMaximum}
        />
      ))}
      <KernelCones input={input} frame={frame} accent={accent} />
      {input.points.map((point) => (
        <circle
          key={point.id}
          data-point-position={`${point.x},${point.y}`}
          cx={180 + point.x * 2.8}
          cy={200 + point.y * 2.8}
          r={4}
          fill={STOCK.text}
          stroke={STOCK.ground}
          strokeWidth={1}
        />
      ))}
    </g>
  );
}
