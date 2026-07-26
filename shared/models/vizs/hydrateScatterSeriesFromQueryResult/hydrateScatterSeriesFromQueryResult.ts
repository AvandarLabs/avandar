import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { columnNameSet } from "$/models/vizs/hydrateColumnPicking.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig.ts";

type ScatterSeriesConfig = {
  series: readonly ScatterSeries[];
};

/**
 * Reconcile a scatter config against current query columns. Prunes
 * series whose `xKey` or `key` reference columns that no longer exist,
 * then seeds the first series from the first two numeric columns when
 * the series array is empty.
 *
 * Goal: never silently reference a missing column when SQL changes.
 *
 * @param currVizConfig Current scatter viz config.
 * @param columns Result columns with names and `AvaDataType`.
 * @returns Updated config with stale series pruned and defaults seeded.
 */
export function hydrateScatterSeriesFromQueryResult<
  VConfig extends ScatterSeriesConfig,
>(currVizConfig: VConfig, columns: readonly QueryResultColumn[]): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }
  const colNames = columnNameSet(columns);

  let nextSeries: ScatterSeries[] = currVizConfig.series.filter((s) => {
    return colNames.has(s.xKey) && colNames.has(s.key);
  });

  if (nextSeries.length === 0) {
    const numerics = columns.filter((c) => {
      return AvaDataType.isNumeric(c.dataType);
    });
    if (numerics.length >= 2) {
      nextSeries = [{ xKey: numerics[0]!.name, key: numerics[1]!.name }];
    } else if (numerics.length === 1) {
      const only = numerics[0]!.name;
      nextSeries = [{ xKey: only, key: only }];
    }
  }

  return { ...currVizConfig, series: nextSeries };
}
