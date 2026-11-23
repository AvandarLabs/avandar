import { useMemo } from "react";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getJobPlacementFromPlanAndFrame } from "./getJobPlacementFromPlanAndFrame";
import { makeJobTransfersFromInput } from "./makeJobTransfersFromInput";
import { WorkBlocksJob } from "./WorkBlocksJob/WorkBlocksJob";
import type { Input } from "./ComputeCapacityConsolidation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** One stable categorical swatch per job, in job order. */
const CATEGORY_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
/** Stable swatches associate intact work blocks with a reserved legend rail. */
export function WorkBlocks({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const palette = CATEGORY_KEYS.map((key) => {
    return tokens.color.categorical[key];
  });
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
        const color = palette[index];
        const legendX = 55 + (index % 4) * 215;
        const legendY = 437 + Math.floor(index / 4) * 44;
        return (
          <WorkBlocksJob
            key={job.id}
            {...{ job, index, x, y, height, color, legendX, legendY }}
          />
        );
      })}
    </g>
  );
}

/** The type of `CATEGORY_KEYS` used by WorkBlocks. */
export type WorkBlocksCategoryKeysValue = typeof CATEGORY_KEYS;
