import { useMemo } from "react";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getJobPlacementFromPlanAndFrame } from "./getJobPlacementFromPlanAndFrame";
import { makeJobTransfersFromInput } from "./makeJobTransfersFromInput";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ComputeCapacityConsolidation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
const CATEGORY_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
/** Stable swatches associate intact work blocks with a reserved legend rail. */
export function WorkBlocks({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const plan = useMemo(() => {
    return makeJobTransfersFromInput(input);
  }, [input]);
  return (
    <g>
      {input.jobs.map((job, index) => {
        const { x, y, height } = getJobPlacementFromPlanAndFrame({
          motion,
          plan,
          index,
          frame,
        });
        const color = tokens.color.categorical[CATEGORY_KEYS[index]];
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
