import { StockRect } from "../../../primitives/StockRect";
import { SceneLabel } from "../SceneLabel";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ComputeCapacityConsolidation.schema";
import type { getJobPlacementFromPlanAndFrame } from "../getJobPlacementFromPlanAndFrame";
import type { WorkBlocksCategoryKeysValue } from "../WorkBlocks";
import type { ReactNode } from "react";

type Props = {
  job: Input["jobs"][number];
  index: number;
  x: ReturnType<typeof getJobPlacementFromPlanAndFrame>["x"];
  y: ReturnType<typeof getJobPlacementFromPlanAndFrame>["y"];
  height: ReturnType<typeof getJobPlacementFromPlanAndFrame>["height"];
  color: Array<
    ReturnType<
      typeof GraphicThemeHooks.useGraphicTokens
    >["color"]["categorical"][WorkBlocksCategoryKeysValue[number]]
  >[number];
  legendX: number;
  legendY: number;
};

/** Renders the job with authored geometry. */
export function WorkBlocksJob({
  job,
  index,
  x,
  y,
  height,
  color,
  legendX,
  legendY,
}: Readonly<Props>): ReactNode {
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
}
