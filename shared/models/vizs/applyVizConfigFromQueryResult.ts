import {
  shouldHydrateVizFromQueryResult,
} from "$/models/vizs/shouldHydrateVizFromQueryResult.ts";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs.ts";
import type {
  PartialStructuredQuery,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type {
  QueryResultColumn,
} from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types.ts";

type ApplyVizConfigFromQueryResultInput = {
  vizConfig: VizConfig;
  rawSQL: string | undefined;
  query: PartialStructuredQuery;
  columns: readonly QueryResultColumn[];
};

/**
 * Returns true when two viz configs match for Data Explorer sync: same viz
 * type and, for all non-table viz types, the same primary axis keys.
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

  const vt = a.vizType;

  if (vt === "pie" || vt === "funnel" || vt === "radar") {
    const ap = a as {
      nameKey: string | undefined;
      valueKey: string | undefined;
    };
    const bp = b as {
      nameKey: string | undefined;
      valueKey: string | undefined;
    };
    return ap.nameKey === bp.nameKey && ap.valueKey === bp.valueKey;
  }

  const ax = a as {
    xAxisKey: string | undefined;
    yAxisKey: string | undefined;
  };
  const bx = b as {
    xAxisKey: string | undefined;
    yAxisKey: string | undefined;
  };

  return ax.xAxisKey === bx.xAxisKey && ax.yAxisKey === bx.yAxisKey;
}

/**
 * Clears stale axis keys missing from the result, then runs
 * `hydrateFromQueryResult` when `shouldHydrateVizFromQueryResult` is true.
 * **2B:** Skips hydration when both primary axes remain valid in the result
 * (see `shouldHydrateVizFromQueryResult`).
 *
 * @param input Current viz, query context, and result columns.
 * @returns The viz config after validation and optional result hydration.
 */
export function applyVizConfigFromQueryResult(
  input: ApplyVizConfigFromQueryResultInput,
): VizConfig {
  const { vizConfig, rawSQL, query, columns } = input;
  const resultColumnNames = new Set(
    columns.map((c) => {
      return c.name;
    }),
  );

  let next: VizConfig = vizConfig;

  const { config: cleared, didChange } = _clearStaleAxisKeys(
    vizConfig,
    resultColumnNames,
  );
  if (didChange) {
    next = cleared;
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

/**
 * Returns a copy of `vizConfig` with any stale axis keys cleared (i.e.
 * keys that no longer appear in `resultColumnNames`), plus a flag indicating
 * whether any key was cleared.
 */
function _clearStaleAxisKeys(
  vizConfig: VizConfig,
  resultColumnNames: ReadonlySet<string>,
): { config: VizConfig; didChange: boolean } {
  if (vizConfig.vizType === "table") {
    return { config: vizConfig, didChange: false };
  }

  const vt = vizConfig.vizType;

  if (vt === "pie" || vt === "funnel" || vt === "radar") {
    const pv = vizConfig as {
      nameKey: string | undefined;
      valueKey: string | undefined;
    };
    let cleared: VizConfig = vizConfig;
    let didChange = false;

    if (pv.nameKey !== undefined && !resultColumnNames.has(pv.nameKey)) {
      cleared = { ...cleared, nameKey: undefined } as VizConfig;
      didChange = true;
    }

    if (pv.valueKey !== undefined && !resultColumnNames.has(pv.valueKey)) {
      cleared = { ...cleared, valueKey: undefined } as VizConfig;
      didChange = true;
    }

    return { config: cleared, didChange };
  }

  const xy = vizConfig as {
    xAxisKey: string | undefined;
    yAxisKey: string | undefined;
  };
  let cleared: VizConfig = vizConfig;
  let didChange = false;

  if (xy.xAxisKey !== undefined && !resultColumnNames.has(xy.xAxisKey)) {
    cleared = { ...cleared, xAxisKey: undefined } as VizConfig;
    didChange = true;
  }

  if (xy.yAxisKey !== undefined && !resultColumnNames.has(xy.yAxisKey)) {
    cleared = { ...cleared, yAxisKey: undefined } as VizConfig;
    didChange = true;
  }

  return { config: cleared, didChange };
}
