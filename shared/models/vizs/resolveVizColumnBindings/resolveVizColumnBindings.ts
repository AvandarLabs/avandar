import { match } from "ts-pattern";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { BindingIssue } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { BoundVizConfig } from "$/models/vizs/BoundVizConfig/BoundVizConfig.ts";
import type {
  LegacyXYSeries,
  LegacyRadarSeries,
  LegacyScatterSeries,
  LegacyBubbleSeries,
} from "$/models/vizs/BoundVizConfig/LegacyVizConfig.types.ts";

type ColumnBinding = (
  key: QueryColumn.Id | undefined,
  target: string,
) => string | undefined;

/** Produces renderer row keys using saved IDs without modifying bindings. */
export function resolveVizColumnBindings(
  config: Readonly<BoundVizConfig.T>,
  columns: readonly QueryResult.BoundColumn[],
): { config: BoundVizConfig.Resolved; issues: readonly BindingIssue[] } {
  const issues: BindingIssue[] = [];
  const columnsById = new Map(
    columns.map((column) => {
      return [column.id, column];
    }),
  );
  const bindColumn: ColumnBinding = (key, target) => {
    if (key === undefined) {
      return undefined;
    }
    const name = columnsById.get(key)?.name;
    if (name === undefined) {
      issues.push({ target, reason: "missing" });
    }
    return name;
  };
  return { config: _mapConfig({ config, bindColumn }), issues };
}

function _mapConfig(
  options: Readonly<{
    config: Readonly<BoundVizConfig.T>;
    bindColumn: ColumnBinding;
  }>,
): BoundVizConfig.Resolved {
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
        series: _mapRadarSeries({ series: chart.series, bindColumn }),
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

function _mapXYConfig(
  options: Readonly<{
    config: Extract<BoundVizConfig.T, { vizType: "bar" | "line" | "area" }>;
    bindColumn: ColumnBinding;
  }>,
): Extract<BoundVizConfig.Resolved, { vizType: "bar" | "line" | "area" }> {
  const { config, bindColumn } = options;
  return {
    ...config,
    xAxisKey: bindColumn(config.xAxisKey, "xAxisKey"),
    series: _mapSeries({ series: config.series, bindColumn }),
  };
}

function _mapCategoryConfig(
  options: Readonly<{
    config: Extract<BoundVizConfig.T, { vizType: "pie" | "funnel" }>;
    bindColumn: ColumnBinding;
  }>,
): Extract<BoundVizConfig.Resolved, { vizType: "pie" | "funnel" }> {
  const { config, bindColumn } = options;
  return {
    ...config,
    nameKey: bindColumn(config.nameKey, "nameKey"),
    valueKey: bindColumn(config.valueKey, "valueKey"),
  };
}

function _mapSeries(
  options: Readonly<{
    series: readonly BoundVizConfig.XYSeries[];
    bindColumn: ColumnBinding;
  }>,
): LegacyXYSeries[] {
  return options.series.flatMap((series, index) => {
    const key = options.bindColumn(series.key, `series.${index}.key`);
    return key === undefined ? [] : [{ ...series, key }];
  });
}

function _mapRadarSeries(
  options: Readonly<{
    series: readonly BoundVizConfig.RadarSeries[];
    bindColumn: ColumnBinding;
  }>,
): LegacyRadarSeries[] {
  return options.series.flatMap((series, index) => {
    const key = options.bindColumn(series.key, `series.${index}.key`);
    return key === undefined ? [] : [{ ...series, key }];
  });
}

function _mapScatterSeries(
  options: Readonly<{
    series: readonly BoundVizConfig.ScatterSeries[];
    bindColumn: ColumnBinding;
  }>,
): LegacyScatterSeries[] {
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
    series: readonly BoundVizConfig.BubbleSeries[];
    bindColumn: ColumnBinding;
  }>,
): LegacyBubbleSeries[] {
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
