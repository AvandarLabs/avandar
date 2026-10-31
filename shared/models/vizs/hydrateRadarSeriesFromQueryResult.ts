import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { VizHydrationColumns } from "$/models/vizs/VizHydrationColumns.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { RadarSeries } from "$/models/vizs/SeriesConfig.ts";

type RadarSeriesConfig = {
  nameKey: QueryColumn.Id | undefined;
  series: readonly RadarSeries[];
};

/**
 * Seeds unconfigured slots from column IDs and preserves existing selections
 * and styles, including identities absent from the current result.
 */
export function hydrateRadarSeriesFromQueryResult<
  VConfig extends RadarSeriesConfig,
>(
  currVizConfig: VConfig,
  columns: readonly QueryResult.ColumnWithId[],
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }

  let nextSeries: RadarSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0) {
    const firstNumericId = VizHydrationColumns.getFirstNumericColumnId(columns);
    if (firstNumericId !== undefined) {
      nextSeries = [{ key: firstNumericId }];
    }
  }

  let nextNameKey = currVizConfig.nameKey;
  if (nextNameKey === undefined && nextSeries.length > 0) {
    const seriesKeys = new Set(
      nextSeries.map((s) => {
        return s.key;
      }),
    );
    const others = columns.filter((c) => {
      return !seriesKeys.has(c.id);
    });
    const text = others.find((c) => {
      return AvaDataType.isText(c.dataType);
    });
    const pick =
      text ??
      others.find((c) => {
        return AvaDataType.isTemporal(c.dataType);
      }) ??
      others[0];
    if (pick !== undefined) {
      nextNameKey = pick.id;
    }
  }

  return { ...currVizConfig, nameKey: nextNameKey, series: nextSeries };
}
