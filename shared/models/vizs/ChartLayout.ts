import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types.ts";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types.ts";

type BarLayout = BarChartVizConfig["layout"];
type AreaLayout = AreaChartVizConfig["layout"];

/**
 * Bar and area charts describe the same three multi-series layouts under
 * different names: grouped/overlapping, stacked, and 100% stacked. Area
 * additionally supports `split`, which bar has no counterpart for.
 *
 * Converting between the two chart types maps the shared members so the
 * user's choice survives the hop, and falls back to the target's
 * `makeEmptyConfig` default for members with no counterpart.
 */
const BAR_TO_AREA_LAYOUT = {
  group: "default",
  stack: "stacked",
  percent: "percent",
} as const satisfies Record<BarLayout, AreaLayout>;

const AREA_TO_BAR_LAYOUT = {
  default: "group",
  stacked: "stack",
  percent: "percent",

  // Bar has no split layout, so fall back to the bar default.
  split: "group",
} as const satisfies Record<AreaLayout, BarLayout>;

/** Map a bar chart's layout onto the equivalent area chart layout. */
export function barLayoutToAreaLayout(layout: BarLayout): AreaLayout {
  return BAR_TO_AREA_LAYOUT[layout];
}

/** Map an area chart's layout onto the equivalent bar chart layout. */
export function areaLayoutToBarLayout(layout: AreaLayout): BarLayout {
  return AREA_TO_BAR_LAYOUT[layout];
}
