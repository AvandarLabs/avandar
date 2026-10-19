import { isNonEmptyArray } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { BubbleSeries } from "$/models/vizs/SeriesConfig.ts";

type BubbleSeriesConfig = {
  series: readonly BubbleSeries[];
};

/**
 * Seeds unconfigured slots from column IDs and preserves existing selections
 * and styles, including identities absent from the current result.
 */
export function hydrateBubbleSeriesFromQuery<
  VConfig extends BubbleSeriesConfig,
>(currVizConfig: VConfig, query: PartialStructuredQuery): VConfig {
  const { queryColumns } = query;

  let nextSeries: BubbleSeries[] = [...currVizConfig.series];

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
