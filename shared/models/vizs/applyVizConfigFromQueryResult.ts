import { shouldHydrateVizFromQueryResult } from "$/models/vizs/shouldHydrateVizFromQueryResult.ts";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types.ts";

type ApplyVizConfigFromQueryResultInput = {
  vizConfig: VizConfig;
  rawSQL: string | undefined;
  query: PartialStructuredQuery;
  columns: readonly QueryResultColumn[];
};

/**
 * Returns true when two viz configs match for Data Explorer sync: same viz
 * type and, for XY charts, the same axis keys.
 */
export function isVizConfigEqualForQueryResultSync(
  a: VizConfig,
  b: VizConfig,
): boolean {
  if (a.vizType !== b.vizType) {
    return false;
  }

  if (a.vizType === "table") {
    return true;
  }

  const ax = a as { xAxisKey: string | undefined; yAxisKey: string | undefined };
  const bx = b as { xAxisKey: string | undefined; yAxisKey: string | undefined };

  return ax.xAxisKey === bx.xAxisKey && ax.yAxisKey === bx.yAxisKey;
}

/**
 * Clears X/Y axis keys missing from the result, then runs
 * `hydrateFromQueryResult` when `shouldHydrateVizFromQueryResult` is true.
 * **2B:** Skips hydration when both axes remain valid in the result (see
 * `shouldHydrateVizFromQueryResult`).
 *
 * @param input Current viz, query context, and result columns.
 * @returns The viz config after validation and optional result hydration.
 */
export function applyVizConfigFromQueryResult(
  input: ApplyVizConfigFromQueryResultInput,
): VizConfig {
  const { vizConfig, rawSQL, query, columns } = input;
  const resultColumnNames = new Set(columns.map((c) => c.name));

  let next: VizConfig = vizConfig;

  if (vizConfig.vizType !== "table") {
    const xy = vizConfig as {
      xAxisKey: string | undefined;
      yAxisKey: string | undefined;
    };
    let cleared: VizConfig = vizConfig;
    let didClear = false;

    if (xy.xAxisKey !== undefined && !resultColumnNames.has(xy.xAxisKey)) {
      cleared = { ...cleared, xAxisKey: undefined } as VizConfig;
      didClear = true;
    }

    if (xy.yAxisKey !== undefined && !resultColumnNames.has(xy.yAxisKey)) {
      cleared = { ...cleared, yAxisKey: undefined } as VizConfig;
      didClear = true;
    }

    if (didClear) {
      next = cleared;
    }
  }

  if (
    shouldHydrateVizFromQueryResult({
      rawSQL,
      query,
      vizConfig: next,
      resultColumnNames,
    })
  ) {
    return VizConfigs.hydrateFromQueryResult(next, columns);
  }

  return next;
}
