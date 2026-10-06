import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types.ts";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types.ts";

type BarLayout = BarChartVizConfig["layout"];
type AreaLayout = AreaChartVizConfig["layout"];

const BAR_TO_AREA_LAYOUT = {
  group: "default",
  stack: "stacked",
  percent: "percent",
} as const satisfies Record<BarLayout, AreaLayout>;

const AREA_TO_BAR_LAYOUT = {
  default: "group",
  stacked: "stack",
  percent: "percent",
  split: "group",
} as const satisfies Record<AreaLayout, BarLayout>;

/**
 * Translates a chart layout between the bar and area chart types.
 *
 * Bar and area describe the same three multi-series layouts under
 * different names: grouped/overlapping, stacked, and 100% stacked. Mapping
 * the shared members keeps the user's choice when they switch chart type.
 *
 * The `satisfies Record<...>` on each table makes a new layout member a
 * compile error until it is mapped.
 */
export const ChartLayout = {
  /**
   * Returns the area layout equivalent to a bar layout. Every bar layout
   * has an area counterpart, so nothing is lost in this direction.
   */
  getAreaLayoutFromBarLayout(layout: BarLayout): AreaLayout {
    return BAR_TO_AREA_LAYOUT[layout];
  },

  /**
   * Returns the bar layout equivalent to an area layout. Area's `split`
   * has no bar counterpart and becomes `"group"`, which is also the bar
   * default.
   */
  getBarLayoutFromAreaLayout(layout: AreaLayout): BarLayout {
    return AREA_TO_BAR_LAYOUT[layout];
  },
};
