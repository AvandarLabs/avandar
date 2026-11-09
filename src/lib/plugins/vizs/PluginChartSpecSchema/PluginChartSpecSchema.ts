import { z } from "zod";
import type { PluginChartSpec } from "@avandar/plugin-sdk";

/**
 * Checks the chart spec a plugin chart's transform returns before Avandar
 * draws it with a built-in chart, so a malformed spec shows the chart's
 * render-failed state instead of a broken chart. Typed as the SDK's
 * `PluginChartSpec`, so a parsed spec is one.
 */
export const PluginChartSpecSchema: z.ZodType<PluginChartSpec> = z.object({
  kind: z.enum(["bar", "line", "area"]),
  xColumn: z.string().min(1),
  xColumnType: z.enum(["category", "date"]).optional(),
  series: z
    .array(
      z.object({
        column: z.string().min(1),
        label: z.string().optional(),
      }),
    )
    .min(1),
  layout: z.enum(["group", "stack"]).optional(),
  barGap: z.enum(["default", "none"]).optional(),
});
