import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types";

/**
 * The single stack id every area shares when its layout stacks. Named
 * so the extent calculation and the `<Area>` element cannot drift.
 */
export const AREA_STACK_ID = "1";

/**
 * The area chart's layout modes, taken from the persisted config so the
 * two cannot drift.
 */
export type AreaLayout = AreaChartVizConfig["layout"];

/** How an area layout stacks, as far as the value extent is concerned. */
export type AreaStacking = {
  isPercent: boolean;
  sharedStackId: string | undefined;
};

/**
 * How an area layout stacks, for extent purposes.
 *
 * `split` counts as stacked: it sets `stackOffset: "sign"`, which stacks
 * positives upward and negatives downward, and `computeValueExtent`
 * already sums the two signs separately within a bucket. `percent` sets
 * `stackOffset: "expand"`, which normalizes each column to sum to 1 and
 * only formats the ticks as percentages, so its real domain is 0 to 1
 * rather than 0 to 100.
 */
export function getAreaStacking(layout: AreaLayout): AreaStacking {
  return {
    isPercent: layout === "percent",
    sharedStackId: layout === "default" ? undefined : AREA_STACK_ID,
  };
}
