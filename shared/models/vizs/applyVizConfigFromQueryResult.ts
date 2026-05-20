import { shouldHydrateVizFromQueryResult } from "$/models/vizs/shouldHydrateVizFromQueryResult.ts";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type {
  BubbleSeries,
  RadarSeries,
  ScatterSeries,
  XYSeries,
} from "$/models/vizs/SeriesConfig.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types.ts";

type ApplyVizConfigFromQueryResultInput = {
  vizConfig: VizConfig;
  rawSQL: string | undefined;
  query: PartialStructuredQuery;
  columns: readonly QueryResultColumn[];
};

/**
 * Returns true when two viz configs match for Data Explorer sync: same viz
 * type and, for all non-table viz types, the same primary axis / series keys.
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

  if (vt === "pie" || vt === "funnel") {
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

  if (vt === "radar") {
    const ar = a as {
      nameKey: string | undefined;
      series: readonly RadarSeries[];
    };
    const br = b as {
      nameKey: string | undefined;
      series: readonly RadarSeries[];
    };
    return ar.nameKey === br.nameKey && _sameSeriesKeys(ar.series, br.series);
  }

  if (vt === "bar" || vt === "line" || vt === "area") {
    const ax = a as {
      xAxisKey: string | undefined;
      series: readonly XYSeries[];
    };
    const bx = b as {
      xAxisKey: string | undefined;
      series: readonly XYSeries[];
    };
    return ax.xAxisKey === bx.xAxisKey && _sameSeriesKeys(ax.series, bx.series);
  }

  if (vt === "scatter") {
    const as_ = a as { series: readonly ScatterSeries[] };
    const bs_ = b as { series: readonly ScatterSeries[] };
    return _sameSeriesKeys(as_.series, bs_.series);
  }

  if (vt === "bubble") {
    const as_ = a as { series: readonly BubbleSeries[] };
    const bs_ = b as { series: readonly BubbleSeries[] };
    return _sameSeriesKeys(as_.series, bs_.series);
  }

  return false;
}

function _sameSeriesKeys(
  a: ReadonlyArray<{ key: string }>,
  b: ReadonlyArray<{ key: string }>,
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.key !== b[i]!.key) {
      return false;
    }
  }
  return true;
}

/**
 * Clears stale axis / series keys missing from the result, then runs
 * `hydrateFromQueryResult` when `shouldHydrateVizFromQueryResult` is true.
 * **2B:** Skips hydration when every primary key remains valid in the
 * result (see `shouldHydrateVizFromQueryResult`).
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
 * Returns a copy of `vizConfig` with any stale axis / series keys
 * cleared, plus a flag indicating whether any key was cleared.
 */
function _clearStaleAxisKeys(
  vizConfig: VizConfig,
  resultColumnNames: ReadonlySet<string>,
): { config: VizConfig; didChange: boolean } {
  if (vizConfig.vizType === "table") {
    return { config: vizConfig, didChange: false };
  }

  const vt = vizConfig.vizType;

  if (vt === "pie" || vt === "funnel") {
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

  if (vt === "radar") {
    const rv = vizConfig as {
      nameKey: string | undefined;
      series: readonly RadarSeries[];
    };
    let cleared: VizConfig = vizConfig;
    let didChange = false;

    if (rv.nameKey !== undefined && !resultColumnNames.has(rv.nameKey)) {
      cleared = { ...cleared, nameKey: undefined } as VizConfig;
      didChange = true;
    }

    const filtered = rv.series.filter((s) => {
      return resultColumnNames.has(s.key);
    });
    if (filtered.length !== rv.series.length) {
      cleared = { ...cleared, series: filtered } as VizConfig;
      didChange = true;
    }

    return { config: cleared, didChange };
  }

  if (vt === "bar" || vt === "line" || vt === "area") {
    const xy = vizConfig as {
      xAxisKey: string | undefined;
      series: readonly XYSeries[];
    };
    let cleared: VizConfig = vizConfig;
    let didChange = false;

    if (xy.xAxisKey !== undefined && !resultColumnNames.has(xy.xAxisKey)) {
      cleared = { ...cleared, xAxisKey: undefined } as VizConfig;
      didChange = true;
    }

    const filtered = xy.series.filter((s) => {
      return resultColumnNames.has(s.key);
    });
    if (filtered.length !== xy.series.length) {
      cleared = { ...cleared, series: filtered } as VizConfig;
      didChange = true;
    }

    return { config: cleared, didChange };
  }

  // scatter and bubble now use series arrays
  if (vt === "scatter") {
    const sv = vizConfig as { series: readonly ScatterSeries[] };
    const filtered = sv.series.filter((s) => {
      return resultColumnNames.has(s.xKey) && resultColumnNames.has(s.key);
    });
    if (filtered.length !== sv.series.length) {
      return {
        config: { ...vizConfig, series: filtered } as VizConfig,
        didChange: true,
      };
    }
    return { config: vizConfig, didChange: false };
  }

  // bubble
  const bv = vizConfig as { series: readonly BubbleSeries[] };
  const filtered = bv.series.filter((s) => {
    return (
      resultColumnNames.has(s.xKey) &&
      resultColumnNames.has(s.key) &&
      resultColumnNames.has(s.sizeKey)
    );
  });
  if (filtered.length !== bv.series.length) {
    return {
      config: { ...vizConfig, series: filtered } as VizConfig,
      didChange: true,
    };
  }
  return { config: vizConfig, didChange: false };
}
