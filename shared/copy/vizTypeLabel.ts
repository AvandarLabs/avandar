import { matchLiteral } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import type { VizType } from "$/models/vizs/VizConfig/VizConfig.types.ts";

/**
 * Returns the human-readable label for a visualization type. Shared copy used
 * by every viz type picker.
 *
 * The viz config modules carry an untranslated `displayName` as their stable
 * identifier; this is the display counterpart, resolved at call time so it
 * follows the active locale.
 */
export function vizTypeLabel(vizType: VizType): string {
  return matchLiteral(vizType, {
    table: () => {
      return t`Table`;
    },
    bar: () => {
      return t`Bar Chart`;
    },
    line: () => {
      return t`Line Chart`;
    },
    area: () => {
      return t`Area Chart`;
    },
    radar: () => {
      return t`Radar Chart`;
    },
    scatter: () => {
      return t`Scatter Plot`;
    },
    pie: () => {
      return t`Pie Chart`;
    },
    funnel: () => {
      return t`Funnel Chart`;
    },
    bubble: () => {
      return t`Bubble Chart`;
    },
  });
}
