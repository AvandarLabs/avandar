import { VizHydrationColumns } from "$/models/vizs/hydrations/VizHydrationColumns.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { RenderAs, AvaXYSeries } from "$/models/vizs/series.types.ts";

type XYSeriesConfig = {
  xAxisKey: QueryColumn.Id | undefined;
  series: readonly AvaXYSeries[];
};

/**
 * Fills the empty slots of an XY chart config, such as a bar, line, or area
 * chart, from `QueryResult` columns: one `defaultRenderAs` series on the first
 * numeric column when there are none, then the X axis on a column no series
 * uses, preferring temporal, text, then boolean. Set slots keep their column
 * ID, even when the result lacks that column.
 *
 * Use it so a chart has something to draw once a result arrives, for example
 * from raw SQL, where there is no structured query to seed from.
 */
export function hydrateXYSeriesFromQueryResult<VConfig extends XYSeriesConfig>(
  currVizConfig: VConfig,
  columns: readonly QueryResult.ColumnWithId[],
  defaultRenderAs: RenderAs,
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }

  let nextSeries: AvaXYSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0) {
    const firstNumericId = VizHydrationColumns.getFirstNumericColumnId(columns);
    if (firstNumericId !== undefined) {
      nextSeries = [{ renderAs: defaultRenderAs, key: firstNumericId }];
    }
  }

  let nextXAxisKey = currVizConfig.xAxisKey;
  if (nextXAxisKey === undefined && nextSeries.length > 0) {
    const seriesKeys = new Set(
      nextSeries.map((s) => {
        return s.key;
      }),
    );
    nextXAxisKey = VizHydrationColumns.getCategoryColumnId({
      columns,
      excludedIds: seriesKeys,
    });
  }

  return {
    ...currVizConfig,
    xAxisKey: nextXAxisKey,
    series: nextSeries,
  };
}
