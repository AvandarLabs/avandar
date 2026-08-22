import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { RadarSeries } from "$/models/vizs/SeriesConfig.ts";

import { isNonEmptyArray } from "@avandar/utils";

import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

type RadarSeriesConfig = {
  nameKey: string | undefined;
  series: readonly RadarSeries[];
};

/**
 * Hydrate the `nameKey` and `series` array of a radar viz config from
 * a query. Same approach as {@link hydrateXYSeriesFromQuery}: drop
 * stale series, clear stale `nameKey`, seed defaults from the
 * remaining columns.
 */
export function hydrateRadarSeriesFromQuery<VConfig extends RadarSeriesConfig>(
  currVizConfig: VConfig,
  query: PartialStructuredQuery,
): VConfig {
  const { queryColumns } = query;
  const columnNames = new Set(
    queryColumns.map((c) => {
      return QueryColumn.getDerivedColumnName(c);
    }),
  );

  const filteredSeries = currVizConfig.series.filter((s) => {
    return columnNames.has(s.key);
  });

  const isNameStillValid =
    currVizConfig.nameKey !== undefined &&
    columnNames.has(currVizConfig.nameKey);

  let nextNameKey = isNameStillValid ? currVizConfig.nameKey : undefined;
  let nextSeries: RadarSeries[] = [...filteredSeries];

  if (nextSeries.length === 0 && isNonEmptyArray(queryColumns)) {
    const firstNumeric = queryColumns.find((col) => {
      return (
        QueryColumn.isNumeric(col) &&
        QueryColumn.getDerivedColumnName(col) !== nextNameKey
      );
    });
    if (firstNumeric !== undefined) {
      nextSeries = [{ key: QueryColumn.getDerivedColumnName(firstNumeric) }];
    }
  }

  if (nextNameKey === undefined && isNonEmptyArray(queryColumns)) {
    const seriesKeys = new Set(
      nextSeries.map((s) => {
        return s.key;
      }),
    );
    const firstNonSeries = queryColumns.find((col) => {
      return !seriesKeys.has(QueryColumn.getDerivedColumnName(col));
    });
    if (firstNonSeries !== undefined) {
      nextNameKey = QueryColumn.getDerivedColumnName(firstNonSeries);
    }
  }

  return { ...currVizConfig, nameKey: nextNameKey, series: nextSeries };
}
