import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { AvaScatterSeries } from "$/models/vizs/series.types.ts";

type ScatterSeriesConfig = {
  series: readonly AvaScatterSeries[];
};

/**
 * Gives a scatter plot config with no series one series on the first two
 * numeric `QueryResult` columns for X and Y, or on the only numeric column
 * for both. Existing series are kept, even ones whose columns the result
 * does not have.
 *
 * Use it so a chart has something to draw once a result arrives, for example
 * from raw SQL, where there is no structured query to seed from.
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

  let nextSeries: AvaScatterSeries[] = [...currVizConfig.series];

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
