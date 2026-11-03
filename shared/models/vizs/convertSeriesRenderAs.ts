import { match } from "ts-pattern";
import { DEFAULT_AREA_FILL_OPACITY } from "$/models/vizs/series.types.ts";
import type { AvaXYSeries, RenderAs } from "$/models/vizs/series.types.ts";

/**
 * Converts an XY series to another mark type, keeping the fields every mark
 * type shares (`key`, `label`, `color`) and resetting mark-specific fields
 * to that type's defaults.
 *
 * Use it when a chart's series must render as a different mark, for example
 * when a bar chart becomes a line chart and its series become lines.
 */
export function convertSeriesRenderAs(
  series: AvaXYSeries,
  newRenderAs: RenderAs,
): AvaXYSeries {
  const { key, label, color } = series;
  return match(newRenderAs)
    .with("bar", () => {
      return { renderAs: "bar" as const, key, label, color };
    })
    .with("line", () => {
      return { renderAs: "line" as const, key, label, color };
    })
    .with("area", () => {
      return {
        renderAs: "area" as const,
        key,
        label,
        color,
        fillOpacity: DEFAULT_AREA_FILL_OPACITY,
      };
    })
    .exhaustive();
}
