import type { VizType } from "$/models/vizs/VizConfig/VizConfig.types.ts";

/**
 * Per-visualization caps on how many rows can be passed to the underlying
 * chart library before we truncate the data. Charts that render an SVG node
 * per row (Recharts, Mantine Charts) become unresponsive or crash the tab
 * well before the dataset is "large" in any analytical sense, so we cap
 * client-side and surface a toast explaining the truncation.
 *
 * `name` is the user-facing visualization name used in the toast title.
 * `noun` is the plural unit the viz draws ("bars", "points", ...).
 */
export type VizRenderLimit = {
  max: number;
  name: string;
  noun: string;
};

export const VIZ_RENDER_LIMITS = {
  table: undefined,
  bar: { max: 200, name: "Bar Chart", noun: "bars" },
  line: { max: 500, name: "Line Chart", noun: "points" },
  area: { max: 500, name: "Area Chart", noun: "points" },
  scatter: { max: 1000, name: "Scatter Plot", noun: "points" },
  bubble: { max: 500, name: "Bubble Chart", noun: "bubbles" },
  pie: { max: 50, name: "Pie Chart", noun: "slices" },
  funnel: { max: 50, name: "Funnel Chart", noun: "steps" },
  radar: { max: 50, name: "Radar Chart", noun: "axes" },
} as const satisfies Record<VizType, VizRenderLimit | undefined>;

export type VizRenderLimitKey = keyof typeof VIZ_RENDER_LIMITS;
