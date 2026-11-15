import { isNonEmptyArray } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { AvaScatterSeries } from "$/models/vizs/series.types.ts";

type ScatterSeriesConfig = {
  series: readonly AvaScatterSeries[];
};

/**
 * Gives a scatter plot config with no series one series on a structured
 * query's first two numeric columns for X and Y, or on its only numeric
 * column for both. Existing series are kept, even ones whose columns the
 * query no longer selects.
 *
 * Use it so a chart has something to draw before the user assigns its
 * columns, for example after the query's selected columns change.
 */
export function hydrateScatterSeriesFromQuery<
  VConfig extends ScatterSeriesConfig,
>(currVizConfig: VConfig, query: PartialStructuredQuery): VConfig {
  const { queryColumns } = query;

  let nextSeries: AvaScatterSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0 && isNonEmptyArray(queryColumns)) {
    const numerics = queryColumns.filter(QueryColumn.isNumeric);
    if (numerics.length >= 2) {
      nextSeries = [
        {
          xKey: numerics[0]!.id,
          key: numerics[1]!.id,
        },
      ];
    } else if (numerics.length === 1) {
      const only = numerics[0]!.id;
      nextSeries = [{ xKey: only, key: only }];
    }
  }

  return { ...currVizConfig, series: nextSeries };
}
