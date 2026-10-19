import {
  identity,
  isDefined,
  makeIdLookupMap,
  prop,
  propEq,
} from "@avandar/utils";
import { match } from "ts-pattern";
import { makeColumnSlotsFromVizConfig } from "$/models/vizs/makeColumnSlotsFromVizConfig.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { BindingIssue } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { BoundVizConfig } from "$/models/vizs/BoundVizConfig/BoundVizConfig.ts";

type ColumnBinding = ({
  key,
  target,
}: Readonly<{
  key: QueryColumn.Id | undefined;
  target: string;
}>) => string | undefined;

type ResolvedXYSeries = Extract<
  BoundVizConfig.Resolved,
  { vizType: "bar" }
>["series"][number];

type ResolvedRadarSeries = Extract<
  BoundVizConfig.Resolved,
  { vizType: "radar" }
>["series"][number];

function _mapSeries(
  options: Readonly<{
    series: readonly BoundVizConfig.XYSeries[];
    bindColumn: ColumnBinding;
  }>,
): ResolvedXYSeries[];
function _mapSeries(
  options: Readonly<{
    series: readonly BoundVizConfig.RadarSeries[];
    bindColumn: ColumnBinding;
  }>,
): ResolvedRadarSeries[];
function _mapSeries(
  options: Readonly<{
    series: ReadonlyArray<BoundVizConfig.XYSeries | BoundVizConfig.RadarSeries>;
    bindColumn: ColumnBinding;
  }>,
): Array<ResolvedXYSeries | ResolvedRadarSeries> {
  return options.series.flatMap((series, index) => {
    const key = options.bindColumn({
      key: series.key,
      target: `series.${index}.key`,
    });
    return key === undefined ? [] : [{ ...series, key }];
  });
}

function _mapScatterSeries(
  options: Readonly<{
    series: readonly BoundVizConfig.ScatterSeries[];
    bindColumn: ColumnBinding;
  }>,
): Extract<BoundVizConfig.Resolved, { vizType: "scatter" }>["series"] {
  return options.series.flatMap((series, index) => {
    const key = options.bindColumn({
      key: series.key,
      target: `series.${index}.key`,
    });
    const xKey = options.bindColumn({
      key: series.xKey,
      target: `series.${index}.xKey`,
    });
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
): Extract<BoundVizConfig.Resolved, { vizType: "bubble" }>["series"] {
  return options.series.flatMap((series, index) => {
    const key = options.bindColumn({
      key: series.key,
      target: `series.${index}.key`,
    });
    const xKey = options.bindColumn({
      key: series.xKey,
      target: `series.${index}.xKey`,
    });
    const sizeKey = options.bindColumn({
      key: series.sizeKey,
      target: `series.${index}.sizeKey`,
    });
    return key === undefined || xKey === undefined || sizeKey === undefined
      ? []
      : [{ ...series, key, xKey, sizeKey }];
  });
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
    xAxisKey: bindColumn({ key: config.xAxisKey, target: "xAxisKey" }),
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
    nameKey: bindColumn({ key: config.nameKey, target: "nameKey" }),
    valueKey: bindColumn({ key: config.valueKey, target: "valueKey" }),
  };
}

function _mapConfig(
  options: Readonly<{
    config: Readonly<BoundVizConfig.T>;
    bindColumn: ColumnBinding;
  }>,
): BoundVizConfig.Resolved {
  const { config, bindColumn } = options;
  return match(config)
    .with({ vizType: "table" }, identity)
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
        nameKey: bindColumn({ key: chart.nameKey, target: "nameKey" }),
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

/** Produces renderer row keys using saved IDs without modifying bindings. */
export function makeResolvedVizConfigFromBoundConfig({
  config,
  columns,
}: Readonly<{
  config: Readonly<BoundVizConfig.T>;
  columns: readonly QueryResult.BoundColumn[];
}>): { config: BoundVizConfig.Resolved; issues: BindingIssue[] } {
  const columnsById = makeIdLookupMap(columns);
  const slots = makeColumnSlotsFromVizConfig<QueryColumn.Id>(config).map(
    (slot) => {
      const name =
        slot.key === undefined ? undefined : columnsById.get(slot.key)?.name;
      return {
        target: slot.target,
        name,
        issue:
          slot.key !== undefined && name === undefined
            ? { target: slot.target, reason: "missing" as const }
            : undefined,
      };
    },
  );
  const bindColumn: ColumnBinding = ({ target }) => {
    return slots.find(propEq("target", target))?.name;
  };
  return {
    config: _mapConfig({ config, bindColumn }),
    issues: slots.map(prop("issue")).filter(isDefined),
  };
}
