import { isNonEmptyArray } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { RadarSeries } from "$/models/vizs/SeriesConfig.ts";

type RadarSeriesConfig = {
  nameKey: QueryColumn.Id | undefined;
  series: readonly RadarSeries[];
};

/**
 * Seeds unconfigured slots from column IDs and preserves existing selections
 * and styles, including identities absent from the current result.
 */
export function hydrateRadarSeriesFromQuery<VConfig extends RadarSeriesConfig>(
  currVizConfig: VConfig,
  query: PartialStructuredQuery,
): VConfig {
  const { queryColumns } = query;

  let nextNameKey = currVizConfig.nameKey;
  let nextSeries: RadarSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0 && isNonEmptyArray(queryColumns)) {
    const firstNumeric = queryColumns.find((col) => {
      return QueryColumn.isNumeric(col) && col.id !== nextNameKey;
    });
    if (firstNumeric !== undefined) {
      nextSeries = [{ key: firstNumeric.id }];
    }
  }

  if (nextNameKey === undefined && isNonEmptyArray(queryColumns)) {
    const seriesKeys = new Set(
      nextSeries.map((s) => {
        return s.key;
      }),
    );
    const firstNonSeries = queryColumns.find((col) => {
      return !seriesKeys.has(col.id);
    });
    if (firstNonSeries !== undefined) {
      nextNameKey = firstNonSeries.id;
    }
  }

  return { ...currVizConfig, nameKey: nextNameKey, series: nextSeries };
}
