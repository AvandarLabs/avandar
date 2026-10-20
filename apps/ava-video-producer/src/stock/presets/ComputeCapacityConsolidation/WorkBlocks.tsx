import { StockRect } from "../../primitives/StockRect/StockRect";
import { useMemo } from "react";
import { STOCK } from "../../stockPalette";
import { getJobPlacementFromPlanAndFrame } from "./getJobPlacementFromPlanAndFrame";
import { makeJobTransfersFromInput } from "./makeJobTransfersFromInput";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ComputeCapacityConsolidation.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
const COLORS: string[] = [
  STOCK.mint,
  STOCK.cyan,
  STOCK.orange,
  "#df95aa",
  "#b7a3e8",
  "#e7b792",
  "#87bac7",
  "#bfc790",
];
/** Stable swatches associate intact work blocks with a reserved legend rail. */
export function WorkBlocks({ input, frame }: Readonly<Props>): ReactNode {
  const plan = useMemo(() => makeJobTransfersFromInput(input), [input]);
  return (
    <g>
      {input.jobs.map((job, index) => {
        const { x, y, height } = getJobPlacementFromPlanAndFrame({
          plan,
          index,
          frame,
        });
        const color = COLORS[index];
        const legendX = 55 + (index % 4) * 215;
        const legendY = 437 + Math.floor(index / 4) * 44;
        return (
          <g key={job.id}>
            <StockRect
              data-job={index}
              data-job-id={job.id}
              data-quantity={job.cpuHours}
              x={x}
              y={y}
              width={80}
              height={height}
              fill={color}
            />
            <StockRect
              x={legendX}
              y={legendY - 10}
              width={10}
              height={10}
              fill={color}
            />
            <SceneLabel
              text={job.label}
              x={legendX + 18}
              y={legendY}
              width={195}
              lines={3}
            />
          </g>
        );
      })}
    </g>
  );
}
