import { isNonEmptyArray } from "@utils/guards/isNonEmptyArray/isNonEmptyArray.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { BubbleSeries } from "$/models/vizs/SeriesConfig.ts";

type BubbleSeriesConfig = {
  series: readonly BubbleSeries[];
};

/**
 * Reconcile a bubble config against the current structured query's columns.
 * Series whose `xKey`, `key`, or `sizeKey` are no longer in the query are
 * dropped. When the series array is empty, seeds one series from the first
 * three numeric columns (or fewer with fallback rules).
 *
 * Fallback seeding rules:
 * - 3+ numerics: `{ xKey: n[0], key: n[1], sizeKey: n[2] }`
 * - 2 numerics:  `{ xKey: n[0], key: n[1], sizeKey: n[1] }`
 * - 1 numeric:   `{ xKey: n[0], key: n[0], sizeKey: n[0] }`
 *
 * @param currVizConfig Current bubble viz config.
 * @param query The structured query to hydrate from.
 * @returns Updated config with stale series pruned and defaults seeded.
 */
export function hydrateBubbleSeriesFromQuery<
  VConfig extends BubbleSeriesConfig,
>(currVizConfig: VConfig, query: PartialStructuredQuery): VConfig {
  const { queryColumns } = query;
  const columnNames = new Set(
    queryColumns.map((c) => {
      return QueryColumn.getDerivedColumnName(c);
    }),
  );

  let nextSeries: BubbleSeries[] = currVizConfig.series.filter((s) => {
    return (
      columnNames.has(s.xKey) &&
      columnNames.has(s.key) &&
      columnNames.has(s.sizeKey)
    );
  });

  if (nextSeries.length === 0 && isNonEmptyArray(queryColumns)) {
    const numerics = queryColumns.filter(QueryColumn.isNumeric);
    if (numerics.length >= 3) {
      nextSeries = [
        {
          xKey: QueryColumn.getDerivedColumnName(numerics[0]!),
          key: QueryColumn.getDerivedColumnName(numerics[1]!),
          sizeKey: QueryColumn.getDerivedColumnName(numerics[2]!),
        },
      ];
    } else if (numerics.length === 2) {
      const n0 = QueryColumn.getDerivedColumnName(numerics[0]!);
      const n1 = QueryColumn.getDerivedColumnName(numerics[1]!);
      nextSeries = [{ xKey: n0, key: n1, sizeKey: n1 }];
    } else if (numerics.length === 1) {
      const only = QueryColumn.getDerivedColumnName(numerics[0]!);
      nextSeries = [{ xKey: only, key: only, sizeKey: only }];
    }
  }

  return { ...currVizConfig, series: nextSeries };
}
