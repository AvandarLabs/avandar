import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { AvaBubbleSeries } from "$/models/vizs/series.types.ts";

type BubbleSeriesConfig = {
  series: readonly AvaBubbleSeries[];
};

/**
 * Seeds unconfigured slots from column IDs and preserves existing selections
 * and styles, including identities absent from the current result.
 */
export function hydrateBubbleSeriesFromQueryResult<
  VConfig extends BubbleSeriesConfig,
>(
  currVizConfig: VConfig,
  columns: readonly QueryResult.ColumnWithId[],
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }

  let nextSeries: AvaBubbleSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0) {
    const numerics = columns.filter((c) => {
      return AvaDataType.isNumeric(c.dataType);
    });
    if (numerics.length >= 3) {
      nextSeries = [
        {
          xKey: numerics[0]!.id,
          key: numerics[1]!.id,
          sizeKey: numerics[2]!.id,
        },
      ];
    } else if (numerics.length === 2) {
      nextSeries = [
        {
          xKey: numerics[0]!.id,
          key: numerics[1]!.id,
          sizeKey: numerics[1]!.id,
        },
      ];
    } else if (numerics.length === 1) {
      const only = numerics[0]!.id;
      nextSeries = [{ xKey: only, key: only, sizeKey: only }];
    }
  }

  return { ...currVizConfig, series: nextSeries };
}
