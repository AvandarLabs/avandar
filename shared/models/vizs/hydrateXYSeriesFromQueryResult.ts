import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { RenderAs, XYSeries } from "$/models/vizs/SeriesConfig.ts";

type XYSeriesConfig = {
  xAxisKey: string | undefined;
  series: readonly XYSeries[];
};

/**
 * Hydrate XY-series config (bar / line / area) from query result column
 * metadata. Fills in any missing series (seeding with the first
 * numeric column) and a missing x axis (preferring temporal, then
 * text, then boolean, then another numeric).
 */
export function hydrateXYSeriesFromQueryResult<VConfig extends XYSeriesConfig>(
  currVizConfig: VConfig,
  columns: readonly QueryResultColumn[],
  defaultRenderAs: RenderAs,
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }

  let nextSeries: XYSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0) {
    const firstNumeric = columns.find((c) => {
      return AvaDataType.isNumeric(c.dataType);
    });
    if (firstNumeric !== undefined) {
      nextSeries = [{ renderAs: defaultRenderAs, key: firstNumeric.name }];
    }
  }

  let nextXAxisKey = currVizConfig.xAxisKey;
  if (nextXAxisKey === undefined && nextSeries.length > 0) {
    const seriesKeys = new Set(
      nextSeries.map((s) => {
        return s.key;
      }),
    );
    nextXAxisKey = _pickBarLineXColumnName(columns, seriesKeys);
  }

  return {
    ...currVizConfig,
    xAxisKey: nextXAxisKey,
    series: nextSeries,
  };
}

/**
 * Preferred X column for bar / line / area: temporal, then text, then
 * boolean (as category), then a numeric column that isn't already
 * being used as a series.
 */
function _pickBarLineXColumnName(
  columns: readonly QueryResultColumn[],
  seriesKeys: ReadonlySet<string>,
): string | undefined {
  const others = columns.filter((c) => {
    return !seriesKeys.has(c.name);
  });
  const temporal = others.find((c) => {
    return AvaDataType.isTemporal(c.dataType);
  });
  if (temporal !== undefined) {
    return temporal.name;
  }
  const text = others.find((c) => {
    return AvaDataType.isText(c.dataType);
  });
  if (text !== undefined) {
    return text.name;
  }
  const booleanCol = others.find((c) => {
    return c.dataType === "boolean";
  });
  if (booleanCol !== undefined) {
    return booleanCol.name;
  }
  const numeric = others.find((c) => {
    return AvaDataType.isNumeric(c.dataType);
  });
  if (numeric !== undefined) {
    return numeric.name;
  }
  return others[0]?.name;
}
