import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { VizHydrationColumns } from "$/models/vizs/hydrations/VizHydrationColumns.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { AvaRadarSeries } from "$/models/vizs/series.types.ts";

type RadarSeriesConfig = {
  nameKey: QueryColumn.Id | undefined;
  series: readonly AvaRadarSeries[];
};

/**
 * Fills a radar chart config's empty slots from `QueryResult` columns: one
 * series on the first numeric column when there are none, and the name axis
 * on a column no series uses, preferring text, then temporal. Set slots keep
 * their column ID, even when the result lacks that column.
 *
 * Use it so a chart has something to draw once a result arrives, for example
 * from raw SQL, where there is no structured query to seed from.
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

  let nextSeries: AvaRadarSeries[] = [...currVizConfig.series];

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
