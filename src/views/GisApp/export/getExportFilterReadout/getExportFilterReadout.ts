import { formatDate } from "@avandar/utils";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** Filters disclosed in furniture rather than drawn on the map. */
export type ExportFilterReadout = {
  timeWindow: string | undefined;
  hasAoi: boolean;
};

/** Day-first, spelled-month pattern, matching the sheet in shell design 7.1. */
const WINDOW_DATE_FORMAT = "D MMM YYYY";

/**
 * Renders the stored inclusive ISO-8601 range as a printable window.
 *
 * The month name follows the reader's own locale, which `formatDate` resolves
 * on its own, so nothing here has to thread a locale through. `zone: "UTC"`
 * keeps the printed day tied to the stored instant rather than to the machine
 * rendering the export: a window saved in Goma must not shift a day because it
 * was exported in Geneva.
 */
function _formatTimeWindow(timeRange: AvaMapConfig.TimeRange): string {
  const start = formatDate(timeRange.start, {
    zone: "UTC",
    format: WINDOW_DATE_FORMAT,
  });
  const end = formatDate(timeRange.end, {
    zone: "UTC",
    format: WINDOW_DATE_FORMAT,
  });
  return `${start} - ${end}`;
}

/**
 * Resolves the active map filters into a printable disclosure.
 *
 * The AOI line's wording belongs to the sheet and the PDF composer, since it
 * is a Lingui string: this function reports only whether an AOI is applied,
 * never its geometry or any localized copy.
 */
export function getExportFilterReadout(
  config: AvaMapConfig.T,
): ExportFilterReadout {
  return {
    timeWindow: config.timeRange
      ? _formatTimeWindow(config.timeRange)
      : undefined,
    hasAoi: config.aoi !== undefined,
  };
}
