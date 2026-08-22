import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { RenderAs, XYSeries } from "$/models/vizs/SeriesConfig.ts";

import { isNonEmptyArray } from "@avandar/utils";

import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

type XYSeriesConfig = {
  xAxisKey: string | undefined;
  series: readonly XYSeries[];
};

/**
 * Hydrate the `xAxisKey` and `series` array of an XY-host viz config
 * (bar / line / area) from a query.
 *
 * - Series whose `key` is no longer present in the query's columns are
 *   dropped.
 * - If `xAxisKey` is no longer present, it's cleared.
 * - If the series array becomes empty, seed one series using the first
 *   numeric column that isn't the x axis, with `renderAs` set to the
 *   host's default.
 * - If `xAxisKey` is undefined after that, pick the first column
 *   that isn't already a series key.
 */
export function hydrateXYSeriesFromQuery<VConfig extends XYSeriesConfig>(
  currVizConfig: VConfig,
  query: PartialStructuredQuery,
  defaultRenderAs: RenderAs,
): VConfig {
  const { queryColumns } = query;
  const columnNames = new Set(
    queryColumns.map((c) => {
      return QueryColumn.getDerivedColumnName(c);
    }),
  );

  const filteredSeries = currVizConfig.series.filter((s) => {
    return columnNames.has(s.key);
  });

  const isXAxisStillValid =
    currVizConfig.xAxisKey !== undefined &&
    columnNames.has(currVizConfig.xAxisKey);

  let nextXAxisKey = isXAxisStillValid ? currVizConfig.xAxisKey : undefined;

  let nextSeries: XYSeries[] = [...filteredSeries];

  if (nextSeries.length === 0 && isNonEmptyArray(queryColumns)) {
    const firstNumeric = queryColumns.find((col) => {
      const name = QueryColumn.getDerivedColumnName(col);
      return QueryColumn.isNumeric(col) && name !== nextXAxisKey;
    });
    if (firstNumeric !== undefined) {
      nextSeries = [
        {
          renderAs: defaultRenderAs,
          key: QueryColumn.getDerivedColumnName(firstNumeric),
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
      const name = QueryColumn.getDerivedColumnName(col);
      return !seriesKeys.has(name);
    });
    if (firstNonSeries !== undefined) {
      nextXAxisKey = QueryColumn.getDerivedColumnName(firstNonSeries);
    }
  }

  return {
    ...currVizConfig,
    xAxisKey: nextXAxisKey,
    series: nextSeries,
  };
}
