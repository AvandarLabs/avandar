import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { RadarSeries } from "$/models/vizs/SeriesConfig.ts";

import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import {
  columnNameSet,
  pickFirstNumericColumnName,
} from "$/models/vizs/hydrateColumnPicking.ts";

type RadarSeriesConfig = {
  nameKey: string | undefined;
  series: readonly RadarSeries[];
};

/**
 * Reconcile a radar config against current query columns: prune any
 * `nameKey` or `series[i].key` that references a column the query no
 * longer returns, then seed sensible defaults. The first numeric
 * column becomes the first series; the first non-series text/temporal
 * column becomes the name axis. Goal: a config that always renders
 * something useful when columns change, never references a missing
 * column.
 */
export function hydrateRadarSeriesFromQueryResult<
  VConfig extends RadarSeriesConfig,
>(currVizConfig: VConfig, columns: readonly QueryResultColumn[]): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }
  const colNames = columnNameSet(columns);

  let nextSeries: RadarSeries[] = currVizConfig.series.filter((s) => {
    return colNames.has(s.key);
  });

  if (nextSeries.length === 0) {
    const firstNumericName = pickFirstNumericColumnName(columns);
    if (firstNumericName !== undefined) {
      nextSeries = [{ key: firstNumericName }];
    }
  }

  let nextNameKey =
    currVizConfig.nameKey && colNames.has(currVizConfig.nameKey)
      ? currVizConfig.nameKey
      : undefined;
  if (nextNameKey === undefined && nextSeries.length > 0) {
    const seriesKeys = new Set(
      nextSeries.map((s) => {
        return s.key;
      }),
    );
    const others = columns.filter((c) => {
      return !seriesKeys.has(c.name);
    });
    const text = others.find((c) => {
      return AvaDataType.isText(c.dataType);
    });
    const pick =
      text ??
      others.find((c) => {
        return AvaDataType.isTemporal(c.dataType);
      }) ??
      others[0];
    if (pick !== undefined) {
      nextNameKey = pick.name;
    }
  }

  return { ...currVizConfig, nameKey: nextNameKey, series: nextSeries };
}
