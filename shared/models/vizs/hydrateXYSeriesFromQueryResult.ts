import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { RenderAs, XYSeries } from "$/models/vizs/SeriesConfig.ts";

type XYSeriesConfig = {
  xAxisKey: string | undefined;
  series: readonly XYSeries[];
};

/**
 * Reconcile an XY-series chart config (bar / line / area) against the
 * current query columns:
 *
 *   1. Prune `xAxisKey` if the named column is no longer in the result.
 *   2. Prune any `series[i]` whose `key` is no longer in the result.
 *   3. Seed the first series from the first numeric column when series
 *      is empty.
 *   4. Seed `xAxisKey` from a sensible category column when undefined
 *      (temporal, then text, then boolean, then another numeric).
 *
 * The goal: when a new SQL prompt changes the result columns, the
 * chart never silently references a missing column. Stale keys are
 * dropped and sensible defaults seeded so a config always renders
 * something useful as long as columns are non-empty.
 */
export function hydrateXYSeriesFromQueryResult<VConfig extends XYSeriesConfig>(
  currVizConfig: VConfig,
  columns: readonly QueryResultColumn[],
  defaultRenderAs: RenderAs,
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }
  const colNames = new Set(
    columns.map((c) => {
      return c.name;
    }),
  );

  let nextSeries: XYSeries[] = currVizConfig.series.filter((s) => {
    return colNames.has(s.key);
  });

  if (nextSeries.length === 0) {
    const firstNumeric = columns.find((c) => {
      return AvaDataType.isNumeric(c.dataType);
    });
    if (firstNumeric !== undefined) {
      nextSeries = [{ renderAs: defaultRenderAs, key: firstNumeric.name }];
    }
  }

  let nextXAxisKey =
    currVizConfig.xAxisKey && colNames.has(currVizConfig.xAxisKey) ?
      currVizConfig.xAxisKey
    : undefined;
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
