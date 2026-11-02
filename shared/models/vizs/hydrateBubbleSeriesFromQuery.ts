import { isNonEmptyArray } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { AvaBubbleSeries } from "$/models/vizs/series.types.ts";

type BubbleSeriesConfig = {
  series: readonly AvaBubbleSeries[];
};

/**
 * Gives a bubble chart config with no series one series on a structured
 * query's numeric columns for X, Y, and size, reusing a column when there are
 * fewer than three. Existing series are kept, even ones whose columns the
 * query no longer selects.
 *
 * Use it so a chart has something to draw before the user assigns its
 * columns, for example after the query's selected columns change.
 */
export function hydrateBubbleSeriesFromQuery<
  VConfig extends BubbleSeriesConfig,
>(currVizConfig: VConfig, query: PartialStructuredQuery): VConfig {
  const { queryColumns } = query;

  let nextSeries: AvaBubbleSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0 && isNonEmptyArray(queryColumns)) {
    const numerics = queryColumns.filter(QueryColumn.isNumeric);
    if (numerics.length >= 3) {
      nextSeries = [
        {
          xKey: numerics[0]!.id,
          key: numerics[1]!.id,
          sizeKey: numerics[2]!.id,
        },
      ];
    } else if (numerics.length === 2) {
      const firstNumericColumnId = numerics[0]!.id;
      const secondNumericColumnId = numerics[1]!.id;
      nextSeries = [
        {
          xKey: firstNumericColumnId,
          key: secondNumericColumnId,
          sizeKey: secondNumericColumnId,
        },
      ];
    } else if (numerics.length === 1) {
      const onlyNumericColumnId = numerics[0]!.id;
      nextSeries = [
        {
          xKey: onlyNumericColumnId,
          key: onlyNumericColumnId,
          sizeKey: onlyNumericColumnId,
        },
      ];
    }
  }

  return { ...currVizConfig, series: nextSeries };
}
