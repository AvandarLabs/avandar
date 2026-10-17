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
      const n0 = numerics[0]!.id;
      const n1 = numerics[1]!.id;
      nextSeries = [{ xKey: n0, key: n1, sizeKey: n1 }];
    } else if (numerics.length === 1) {
      const only = numerics[0]!.id;
      nextSeries = [{ xKey: only, key: only, sizeKey: only }];
    }
  }

  return { ...currVizConfig, series: nextSeries };
}
