import { match } from "ts-pattern";
import { DEFAULT_AREA_FILL_OPACITY } from "$/models/vizs/series.types.ts";
import type { AvaXYSeries, RenderAs } from "$/models/vizs/series.types.ts";

/**
 * Convert an XY series from one mark type to another, preserving
 * fields that are common across mark types (`key`, `label`, `color`)
 * and resetting mark-specific fields to type-appropriate defaults.
 *
 * Used by `convertVizConfig` when the user changes the host viz type
 * (e.g. bar -> line), so existing series flip their default render
 * mode without manual reassignment.
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
