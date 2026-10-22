import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig.ts";

type ScatterSeriesConfig = {
  series: readonly ScatterSeries[];
};

/**
 * Seeds unconfigured slots from column IDs and preserves existing selections
 * and styles, including identities absent from the current result.
 */
export function hydrateScatterSeriesFromQueryResult<
  VConfig extends ScatterSeriesConfig,
>(
  currVizConfig: VConfig,
  columns: readonly QueryResult.ColumnWithId[],
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }

  let nextSeries: ScatterSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0) {
    const numerics = columns.filter((c) => {
      return AvaDataType.isNumeric(c.dataType);
    });
    if (numerics.length >= 2) {
      nextSeries = [{ xKey: numerics[0]!.id, key: numerics[1]!.id }];
    } else if (numerics.length === 1) {
      const only = numerics[0]!.id;
      nextSeries = [{ xKey: only, key: only }];
    }
  }

  return { ...currVizConfig, series: nextSeries };
}
