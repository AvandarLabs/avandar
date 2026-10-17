import { isNonEmptyArray } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { RenderAs, XYSeries } from "$/models/vizs/SeriesConfig.ts";

type XYSeriesConfig = {
  xAxisKey: QueryColumn.Id | undefined;
  series: readonly XYSeries[];
};

/**
 * Seeds unconfigured slots from column IDs and preserves existing selections
 * and styles, including identities absent from the current result.
 */
export function hydrateXYSeriesFromQuery<VConfig extends XYSeriesConfig>(
  currVizConfig: VConfig,
  query: PartialStructuredQuery,
  defaultRenderAs: RenderAs,
): VConfig {
  const { queryColumns } = query;

  let nextXAxisKey = currVizConfig.xAxisKey;

  let nextSeries: XYSeries[] = [...currVizConfig.series];

  if (nextSeries.length === 0 && isNonEmptyArray(queryColumns)) {
    const firstNumeric = queryColumns.find((col) => {
      const name = col.id;
      return QueryColumn.isNumeric(col) && name !== nextXAxisKey;
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
      const name = col.id;
      return !seriesKeys.has(name);
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
