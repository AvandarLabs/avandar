import { matchLiteral } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import type { VizType } from "$/models/vizs/VizConfig/VizConfig.types";

/** Returns the translated display name for a given viz type. */
export function getVizDisplayName(type: VizType): string {
  return matchLiteral(type, {
    table: t`Table`,
    bar: t`Bar Chart`,
    line: t`Line Chart`,
    area: t`Area Chart`,
    scatter: t`Scatter Plot`,
    pie: t`Pie Chart`,
    funnel: t`Funnel Chart`,
    radar: t`Radar Chart`,
    bubble: t`Bubble Chart`,
  });
}
