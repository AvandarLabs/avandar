import { match } from "ts-pattern";
import { resolveLegacyColumnName } from "$/models/queries/QueryColumnBindings/resolveLegacyColumnName/resolveLegacyColumnName.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { BindingIssue } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { BoundVizConfig } from "$/models/vizs/BoundVizConfig/BoundVizConfig.ts";

type ColumnBinding = (
  key: string | undefined,
  target: string,
) => QueryColumn.Id | undefined;

function _mapSeries<Series extends { key: string }>(
  options: Readonly<{
    series: readonly Series[];
    bindColumn: ColumnBinding;
  }>,
): Array<Series & { key: QueryColumn.Id }> {
  return options.series.flatMap((series, index) => {
    const key = options.bindColumn(series.key, `series.${index}.key`);
    return key === undefined ? [] : [{ ...series, key }];
  });
}

function _mapScatterSeries(
  options: Readonly<{
    series: Readonly<
      Extract<BoundVizConfig.Legacy, { vizType: "scatter" }>["series"]
    >;
    bindColumn: ColumnBinding;
  }>,
): BoundVizConfig.ScatterSeries[] {
  return options.series.flatMap((series, index) => {
    const key = options.bindColumn(series.key, `series.${index}.key`);
    const xKey = options.bindColumn(series.xKey, `series.${index}.xKey`);
    return key === undefined || xKey === undefined
      ? []
      : [{ ...series, key, xKey }];
  });
}

function _mapBubbleSeries(
  options: Readonly<{
    series: Readonly<
      Extract<BoundVizConfig.Legacy, { vizType: "bubble" }>["series"]
    >;
    bindColumn: ColumnBinding;
  }>,
): BoundVizConfig.BubbleSeries[] {
  return options.series.flatMap((series, index) => {
    const key = options.bindColumn(series.key, `series.${index}.key`);
    const xKey = options.bindColumn(series.xKey, `series.${index}.xKey`);
    const sizeKey = options.bindColumn(
      series.sizeKey,
      `series.${index}.sizeKey`,
    );
    return key === undefined || xKey === undefined || sizeKey === undefined
      ? []
      : [{ ...series, key, xKey, sizeKey }];
  });
}

function _mapXYConfig(
  options: Readonly<{
    config: Extract<
      BoundVizConfig.Legacy,
      { vizType: "bar" | "line" | "area" }
    >;
    bindColumn: ColumnBinding;
  }>,
): Extract<BoundVizConfig.T, { vizType: "bar" | "line" | "area" }> {
  const { config, bindColumn } = options;
  return {
    ...config,
    xAxisKey: bindColumn(config.xAxisKey, "xAxisKey"),
    series: _mapSeries({ series: config.series, bindColumn }),
  };
}

function _mapCategoryConfig(
  options: Readonly<{
    config: Extract<BoundVizConfig.Legacy, { vizType: "pie" | "funnel" }>;
    bindColumn: ColumnBinding;
  }>,
): Extract<BoundVizConfig.T, { vizType: "pie" | "funnel" }> {
  const { config, bindColumn } = options;
  return {
    ...config,
    nameKey: bindColumn(config.nameKey, "nameKey"),
    valueKey: bindColumn(config.valueKey, "valueKey"),
  };
}

function _mapConfig(
  options: Readonly<{
    config: Readonly<BoundVizConfig.Legacy>;
    bindColumn: ColumnBinding;
  }>,
): BoundVizConfig.T {
  const { config, bindColumn } = options;
  return match(config)
    .with({ vizType: "table" }, (chart) => {
      return chart;
    })
    .with(
      { vizType: "bar" },
      { vizType: "line" },
      { vizType: "area" },
      (chart) => {
        return _mapXYConfig({ config: chart, bindColumn });
      },
    )
    .with({ vizType: "radar" }, (chart) => {
      return {
        ...chart,
        nameKey: bindColumn(chart.nameKey, "nameKey"),
        series: _mapSeries({ series: chart.series, bindColumn }),
      };
    })
    .with({ vizType: "scatter" }, (chart) => {
      return {
        ...chart,
        series: _mapScatterSeries({ series: chart.series, bindColumn }),
      };
    })
    .with({ vizType: "bubble" }, (chart) => {
      return {
        ...chart,
        series: _mapBubbleSeries({ series: chart.series, bindColumn }),
      };
    })
    .with({ vizType: "pie" }, { vizType: "funnel" }, (chart) => {
      return _mapCategoryConfig({ config: chart, bindColumn });
    })
    .exhaustive();
}

/** Binds unique legacy column names without modifying the saved input. */
export function bindLegacyVizConfig(
  config: Readonly<BoundVizConfig.Legacy>,
  columns: readonly QueryResult.BoundColumn[],
): { config: BoundVizConfig.T; issues: readonly BindingIssue[] } {
  const issues: BindingIssue[] = [];
  const bindColumn: ColumnBinding = (key, target) => {
    if (key === undefined) {
      return undefined;
    }
    const id = resolveLegacyColumnName(key, columns);
    if (id === undefined) {
      const hasCandidate = columns.some((column) => {
        return column.name.toLowerCase() === key.toLowerCase();
      });
      issues.push({ target, reason: hasCandidate ? "ambiguous" : "missing" });
    }
    return id;
  };
  return { config: _mapConfig({ config, bindColumn }), issues };
}
