import type { VizType } from "$/models/vizs/VizConfig/VizConfig.types.ts";

/**
 * Per-visualization caps on how many rows can be passed to the underlying
 * chart library before we truncate the data. Charts that render an SVG node
 * per row (Recharts, Mantine Charts) become unresponsive or crash the tab
 * well before the dataset is "large" in any analytical sense, so we cap
 * client-side and surface a toast explaining the truncation.
 *
 * `noun` is the plural unit the viz draws ("bars", "points", ...). The
 * user-facing viz name for the truncation toast comes from `vizTypeLabel`,
 * so it stays translated and this config is not duplicated as a copy source.
 */
export type VizRenderLimit = {
  max: number;
  noun: string;
};

export const VIZ_RENDER_LIMITS = {
  table: undefined,
  bar: { max: 200, noun: "bars" },
  line: { max: 500, noun: "points" },
  area: { max: 500, noun: "points" },
  scatter: { max: 1000, noun: "points" },
  bubble: { max: 500, noun: "bubbles" },
  pie: { max: 50, noun: "slices" },
  funnel: { max: 50, noun: "steps" },
  radar: { max: 50, noun: "axes" },
} as const satisfies Record<VizType, VizRenderLimit | undefined>;

export type VizRenderLimitKey = keyof typeof VIZ_RENDER_LIMITS;
