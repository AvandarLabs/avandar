import { isNonEmptyArray } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { AvaRadarSeries } from "$/models/vizs/series.types.ts";

type RadarSeriesConfig = {
  nameKey: QueryColumn.Id | undefined;
  series: readonly AvaRadarSeries[];
};

/**
 * Fills a radar chart config's empty slots from a structured query's columns:
 * one series on a numeric column when there are none, and the name axis on a
 * column no series uses. Set slots keep their column ID, even when the query
 * no longer selects that column.
 *
 * Use it so a chart has something to draw before the user assigns its
 * columns, for example after the query's selected columns change.
 */
export function hydrateRadarSeriesFromQuery<VConfig extends RadarSeriesConfig>(
  currVizConfig: VConfig,
  query: PartialStructuredQuery,
): VConfig {
  const { queryColumns } = query;

  let nextNameKey = currVizConfig.nameKey;
  let nextSeries: AvaRadarSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0 && isNonEmptyArray(queryColumns)) {
    const firstNumeric = queryColumns.find((col) => {
      return QueryColumn.isNumeric(col) && col.id !== nextNameKey;
    });
    if (firstNumeric !== undefined) {
      nextSeries = [{ key: firstNumeric.id }];
    }
  }

  if (nextNameKey === undefined && isNonEmptyArray(queryColumns)) {
    const seriesKeys = new Set(
      nextSeries.map((s) => {
        return s.key;
      }),
    );
    const firstNonSeries = queryColumns.find((col) => {
      return !seriesKeys.has(col.id);
    });
    if (firstNonSeries !== undefined) {
      nextNameKey = firstNonSeries.id;
    }
  }

  return { ...currVizConfig, nameKey: nextNameKey, series: nextSeries };
}
