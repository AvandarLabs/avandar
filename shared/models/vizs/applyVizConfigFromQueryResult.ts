import { resolveColumnKey } from "$/models/vizs/resolveColumnKey.ts";
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
 * Reconciles axis / series keys with the latest result columns. Each key is
 * fed through {@link resolveColumnKey} so case-insensitive matches survive
 * across re-queries (e.g. an old config with `Count` adapts to a result
 * column called `count`). Unresolved keys are dropped — the persisted
 * config will not reference columns the renderer can't find, so the
 * settings UI never shows ghost references.
 *
 * After clearing, `hydrateFromQueryResult` runs when
 * `shouldHydrateVizFromQueryResult` is true so empty configs get seeded.
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

  const { config: cleared, didChange } = _resolveOrClearAxisKeys(
    vizConfig,
    columns,
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
 * Returns a copy of `vizConfig` with every axis / series key passed through
 * {@link resolveColumnKey}: exact match wins, case-insensitive match falls
 * back to the canonical name, and anything unresolved is dropped.
 */
function _resolveOrClearAxisKeys(
  vizConfig: VizConfig,
  columns: readonly QueryResultColumn[],
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

    const nextName = resolveColumnKey(pv.nameKey, columns);
    if (nextName !== pv.nameKey) {
      cleared = { ...cleared, nameKey: nextName } as VizConfig;
      didChange = true;
    }

    const nextValue = resolveColumnKey(pv.valueKey, columns);
    if (nextValue !== pv.valueKey) {
      cleared = { ...cleared, valueKey: nextValue } as VizConfig;
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

    const nextName = resolveColumnKey(rv.nameKey, columns);
    if (nextName !== rv.nameKey) {
      cleared = { ...cleared, nameKey: nextName } as VizConfig;
      didChange = true;
    }

    const remapped: RadarSeries[] = [];
    for (const s of rv.series) {
      const resolved = resolveColumnKey(s.key, columns);
      if (resolved === undefined) {
        continue;
      }
      remapped.push(resolved === s.key ? s : { ...s, key: resolved });
    }
    if (
      remapped.length !== rv.series.length ||
      remapped.some((s, i) => {
        return s.key !== rv.series[i]?.key;
      })
    ) {
      cleared = { ...cleared, series: remapped } as VizConfig;
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

    const nextX = resolveColumnKey(xy.xAxisKey, columns);
    if (nextX !== xy.xAxisKey) {
      cleared = { ...cleared, xAxisKey: nextX } as VizConfig;
      didChange = true;
    }

    const remapped: XYSeries[] = [];
    for (const s of xy.series) {
      const resolved = resolveColumnKey(s.key, columns);
      if (resolved === undefined) {
        continue;
      }
      remapped.push(resolved === s.key ? s : { ...s, key: resolved });
    }
    if (
      remapped.length !== xy.series.length ||
      remapped.some((s, i) => {
        return s.key !== xy.series[i]?.key;
      })
    ) {
      cleared = { ...cleared, series: remapped } as VizConfig;
      didChange = true;
    }

    return { config: cleared, didChange };
  }

  if (vt === "scatter") {
    const sv = vizConfig as { series: readonly ScatterSeries[] };
    const remapped: ScatterSeries[] = [];
    for (const s of sv.series) {
      const xKey = resolveColumnKey(s.xKey, columns);
      const yKey = resolveColumnKey(s.key, columns);
      if (xKey === undefined || yKey === undefined) {
        continue;
      }
      if (xKey === s.xKey && yKey === s.key) {
        remapped.push(s);
      } else {
        remapped.push({ ...s, xKey, key: yKey });
      }
    }
    if (
      remapped.length !== sv.series.length ||
      remapped.some((s, i) => {
        return s.xKey !== sv.series[i]?.xKey || s.key !== sv.series[i]?.key;
      })
    ) {
      return {
        config: { ...vizConfig, series: remapped } as VizConfig,
        didChange: true,
      };
    }
    return { config: vizConfig, didChange: false };
  }

  // bubble
  const bv = vizConfig as { series: readonly BubbleSeries[] };
  const remapped: BubbleSeries[] = [];
  for (const s of bv.series) {
    const xKey = resolveColumnKey(s.xKey, columns);
    const yKey = resolveColumnKey(s.key, columns);
    const sizeKey = resolveColumnKey(s.sizeKey, columns);
    if (xKey === undefined || yKey === undefined || sizeKey === undefined) {
      continue;
    }
    if (xKey === s.xKey && yKey === s.key && sizeKey === s.sizeKey) {
      remapped.push(s);
    } else {
      remapped.push({ ...s, xKey, key: yKey, sizeKey });
    }
  }
  if (
    remapped.length !== bv.series.length ||
    remapped.some((s, i) => {
      const prev = bv.series[i];
      return (
        s.xKey !== prev?.xKey ||
        s.key !== prev?.key ||
        s.sizeKey !== prev?.sizeKey
      );
    })
  ) {
    return {
      config: { ...vizConfig, series: remapped } as VizConfig,
      didChange: true,
    };
  }
  return { config: vizConfig, didChange: false };
}
