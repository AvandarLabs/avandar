import { isNonEmptyArray } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { RenderAs, AvaXYSeries } from "$/models/vizs/series.types.ts";

type XYSeriesConfig = {
  xAxisKey: QueryColumn.Id | undefined;
  series: readonly AvaXYSeries[];
};

/**
 * Fills the empty slots of an XY chart config, such as a bar, line, or area
 * chart, from a structured query's columns: one `defaultRenderAs` series on a
 * numeric column when there are none, and the X axis on a column no series
 * uses. Set slots keep their column ID, even if the query no longer selects it.
 *
 * Use it so a chart has something to draw before the user assigns its
 * columns, for example after the query's selected columns change.
 */
export function hydrateXYSeriesFromQuery<VConfig extends XYSeriesConfig>(
  currVizConfig: VConfig,
  query: PartialStructuredQuery,
  defaultRenderAs: RenderAs,
): VConfig {
  const { queryColumns } = query;

  let nextXAxisKey = currVizConfig.xAxisKey;

  let nextSeries: AvaXYSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0 && isNonEmptyArray(queryColumns)) {
    const firstNumeric = queryColumns.find((col) => {
      return QueryColumn.isNumeric(col) && col.id !== nextXAxisKey;
    });
    if (firstNumeric !== undefined) {
      nextSeries = [
        {
          renderAs: defaultRenderAs,
          key: firstNumeric.id,
        },
      ];
    }
  }

  if (nextXAxisKey === undefined && isNonEmptyArray(queryColumns)) {
    const seriesKeys = new Set(
      nextSeries.map((s) => {
        return s.key;
      }),
    );
    const firstNonSeries = queryColumns.find((col) => {
      return !seriesKeys.has(col.id);
    });
    if (firstNonSeries !== undefined) {
      nextXAxisKey = firstNonSeries.id;
    }
  }

  return {
    ...currVizConfig,
    xAxisKey: nextXAxisKey,
    series: nextSeries,
  };
}
