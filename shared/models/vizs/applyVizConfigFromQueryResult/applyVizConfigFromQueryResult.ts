import { isDefined } from "@utils/guards/isDefined/isDefined.ts";
import { columnNameSet } from "$/models/vizs/hydrateColumnPicking.ts";
import { resolveColumnKey } from "$/models/vizs/resolveColumnKey/resolveColumnKey.ts";
import { shouldHydrateVizFromQueryResult } from "$/models/vizs/shouldHydrateVizFromQueryResult/shouldHydrateVizFromQueryResult.ts";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs.ts";
import { match } from "ts-pattern";
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
  rawSql: string | undefined;
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
  return a.every((seriesA, idx) => {
    return seriesA.key === b[idx]!.key;
  });
}

/**
 * Reconciles axis / series keys with the latest result columns. Each key is
 * fed through {@link resolveColumnKey} so case-insensitive matches survive
 * across re-queries (e.g. an old config with `Count` adapts to a result
 * column called `count`). Unresolved keys are dropped (the persisted
 * config will not reference columns the renderer can't find, so the
 * settings UI never shows ghost references).
 *
 * After clearing, `hydrateFromQueryResult` runs when
 * `shouldHydrateVizFromQueryResult` is true so empty configs get seeded.
 */
export function applyVizConfigFromQueryResult(
  input: ApplyVizConfigFromQueryResultInput,
): VizConfig {
  const { vizConfig, rawSql, query, columns } = input;
  const resultColumnNames = columnNameSet(columns);

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
      rawSql,
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
  return match(vizConfig)
    .with({ vizType: "table" }, (config) => {
      return { config, didChange: false };
    })
    .with({ vizType: "pie" }, { vizType: "funnel" }, (config) => {
      let cleared: VizConfig = config;
      let didChange = false;

      const nextName = resolveColumnKey(config.nameKey, columns);
      if (nextName !== config.nameKey) {
        cleared = { ...cleared, nameKey: nextName } as VizConfig;
        didChange = true;
      }

      const nextValue = resolveColumnKey(config.valueKey, columns);
      if (nextValue !== config.valueKey) {
        cleared = { ...cleared, valueKey: nextValue } as VizConfig;
        didChange = true;
      }

      return { config: cleared, didChange };
    })
    .with({ vizType: "radar" }, (config) => {
      let cleared = config;
      let didChange = false;

      const nextName = resolveColumnKey(config.nameKey, columns);
      if (nextName !== config.nameKey) {
        cleared = { ...cleared, nameKey: nextName };
        didChange = true;
      }

      const { series: remapped, didChange: seriesChanged } = _remapSeriesKeys(
        config.series,
        (s) => {
          const resolved = resolveColumnKey(s.key, columns);
          if (resolved === undefined) {
            return undefined;
          }
          return resolved === s.key ? s : { ...s, key: resolved };
        },
      );
      if (seriesChanged) {
        cleared = { ...cleared, series: remapped };
        didChange = true;
      }

      return { config: cleared, didChange };
    })
    .with(
      { vizType: "bar" },
      { vizType: "line" },
      { vizType: "area" },
      (config) => {
        let cleared: VizConfig = config;
        let didChange = false;

        const nextX = resolveColumnKey(config.xAxisKey, columns);
        if (nextX !== config.xAxisKey) {
          cleared = { ...cleared, xAxisKey: nextX } as VizConfig;
          didChange = true;
        }

        const { series: remapped, didChange: seriesChanged } = _remapSeriesKeys(
          config.series,
          (s) => {
            const resolved = resolveColumnKey(s.key, columns);
            if (resolved === undefined) {
              return undefined;
            }
            return resolved === s.key ? s : { ...s, key: resolved };
          },
        );
        if (seriesChanged) {
          cleared = { ...cleared, series: remapped } as VizConfig;
          didChange = true;
        }

        return { config: cleared, didChange };
      },
    )
    .with({ vizType: "scatter" }, (config) => {
      const { series: remapped, didChange } = _remapSeriesKeys(
        config.series,
        (s) => {
          const xKey = resolveColumnKey(s.xKey, columns);
          const yKey = resolveColumnKey(s.key, columns);
          if (xKey === undefined || yKey === undefined) {
            return undefined;
          }
          return xKey === s.xKey && yKey === s.key ?
              s
            : { ...s, xKey, key: yKey };
        },
      );
      return didChange ?
          { config: { ...config, series: remapped }, didChange: true }
        : { config, didChange: false };
    })
    .with({ vizType: "bubble" }, (config) => {
      const { series: remapped, didChange } = _remapSeriesKeys(
        config.series,
        (s) => {
          const xKey = resolveColumnKey(s.xKey, columns);
          const yKey = resolveColumnKey(s.key, columns);
          const sizeKey = resolveColumnKey(s.sizeKey, columns);
          if (
            xKey === undefined ||
            yKey === undefined ||
            sizeKey === undefined
          ) {
            return undefined;
          }
          return xKey === s.xKey && yKey === s.key && sizeKey === s.sizeKey ?
              s
            : { ...s, xKey, key: yKey, sizeKey };
        },
      );
      return didChange ?
          { config: { ...config, series: remapped }, didChange: true }
        : { config, didChange: false };
    })
    .exhaustive();
}

/**
 * Run every series through `resolveSeries`, dropping the ones it maps to
 * `undefined`, and report whether the result differs from the input.
 * `resolveSeries` returns the same reference for an unchanged series, so
 * reference identity is enough to detect a real change.
 */
function _remapSeriesKeys<S>(
  series: readonly S[],
  resolveSeries: (s: S) => S | undefined,
): { series: S[]; didChange: boolean } {
  const remapped = series.map(resolveSeries).filter(isDefined);
  const didChange =
    remapped.length !== series.length ||
    remapped.some((s, idx) => {
      return s !== series[idx];
    });
  return { series: remapped, didChange };
}
