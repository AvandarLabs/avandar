import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { RadarSeries } from "$/models/vizs/SeriesConfig.ts";

type RadarSeriesConfig = {
  nameKey: string | undefined;
  series: ReadonlyArray<RadarSeries>;
};

/**
 * Hydrate radar config from query result column metadata: seed first
 * numeric column as a series and pick the first non-series column
 * (prefer text/temporal) as the name axis.
 */
export function hydrateRadarSeriesFromQueryResult<
  VConfig extends RadarSeriesConfig,
>(
  currVizConfig: VConfig,
  columns: readonly QueryResultColumn[],
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }

  let nextSeries: RadarSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0) {
    const firstNumeric = columns.find((c) => {
      return AvaDataType.isNumeric(c.dataType);
    });
    if (firstNumeric !== undefined) {
      nextSeries = [{ key: firstNumeric.name }];
    }
  }

  let nextNameKey = currVizConfig.nameKey;
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
