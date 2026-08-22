import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { BubbleSeries } from "$/models/vizs/SeriesConfig.ts";

import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { columnNameSet } from "$/models/vizs/hydrateColumnPicking.ts";

type BubbleSeriesConfig = {
  series: readonly BubbleSeries[];
};

/**
 * Reconcile a bubble config against current query columns. Prunes
 * series whose `xKey`, `key`, or `sizeKey` reference columns that no
 * longer exist, then seeds the first series from the first three numeric
 * columns when the series array is empty.
 *
 * Fallback seeding rules:
 * - 3+ numerics: `{ xKey: n[0], key: n[1], sizeKey: n[2] }`
 * - 2 numerics:  `{ xKey: n[0], key: n[1], sizeKey: n[1] }`
 * - 1 numeric:   `{ xKey: n[0], key: n[0], sizeKey: n[0] }`
 *
 * @param currVizConfig Current bubble viz config.
 * @param columns Result columns with names and `AvaDataType`.
 * @returns Updated config with stale series pruned and defaults seeded.
 */
export function hydrateBubbleSeriesFromQueryResult<
  VConfig extends BubbleSeriesConfig,
>(currVizConfig: VConfig, columns: readonly QueryResultColumn[]): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }
  const colNames = columnNameSet(columns);

  let nextSeries: BubbleSeries[] = currVizConfig.series.filter((s) => {
    return (
      colNames.has(s.xKey) && colNames.has(s.key) && colNames.has(s.sizeKey)
    );
  });

  if (nextSeries.length === 0) {
    const numerics = columns.filter((c) => {
      return AvaDataType.isNumeric(c.dataType);
    });
    if (numerics.length >= 3) {
      nextSeries = [
        {
          xKey: numerics[0]!.name,
          key: numerics[1]!.name,
          sizeKey: numerics[2]!.name,
        },
      ];
    } else if (numerics.length === 2) {
      nextSeries = [
        {
          xKey: numerics[0]!.name,
          key: numerics[1]!.name,
          sizeKey: numerics[1]!.name,
        },
      ];
    } else if (numerics.length === 1) {
      const only = numerics[0]!.name;
      nextSeries = [{ xKey: only, key: only, sizeKey: only }];
    }
  }

  return { ...currVizConfig, series: nextSeries };
}
