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
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { QueryResultColumnBindingIssue } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types.ts";
import type {
  BubbleSeries,
  RadarSeries,
  ScatterSeries,
  XYSeries,
} from "$/models/vizs/SeriesConfig.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.ts";

type GetSlotQueryResultColumnName = ({
  key,
  target,
}: Readonly<{
  key: QueryColumn.Id | undefined;
  target: string;
}>) => string | undefined;

type NameBoundXYSeries = Extract<
  VizConfig.NameBound,
  { vizType: "bar" }
>["series"][number];

type NameBoundRadarSeries = Extract<
  VizConfig.NameBound,
  { vizType: "radar" }
>["series"][number];

function _mapSeries(
  options: Readonly<{
    series: readonly XYSeries[];
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): NameBoundXYSeries[];
function _mapSeries(
  options: Readonly<{
    series: readonly RadarSeries[];
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): NameBoundRadarSeries[];
function _mapSeries(
  options: Readonly<{
    series: ReadonlyArray<XYSeries | RadarSeries>;
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): Array<NameBoundXYSeries | NameBoundRadarSeries> {
  return options.series.flatMap((series, index) => {
    const key = options.getSlotQueryResultColumnName({
      key: series.key,
      target: `series.${index}.key`,
    });
    return key === undefined ? [] : [{ ...series, key }];
  });
}

function _mapScatterSeries(
  options: Readonly<{
    series: readonly ScatterSeries[];
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): Extract<VizConfig.NameBound, { vizType: "scatter" }>["series"] {
  return options.series.flatMap((series, index) => {
    const key = options.getSlotQueryResultColumnName({
      key: series.key,
      target: `series.${index}.key`,
    });
    const xKey = options.getSlotQueryResultColumnName({
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
    series: readonly BubbleSeries[];
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): Extract<VizConfig.NameBound, { vizType: "bubble" }>["series"] {
  return options.series.flatMap((series, index) => {
    const key = options.getSlotQueryResultColumnName({
      key: series.key,
      target: `series.${index}.key`,
    });
    const xKey = options.getSlotQueryResultColumnName({
      key: series.xKey,
      target: `series.${index}.xKey`,
    });
    const sizeKey = options.getSlotQueryResultColumnName({
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
    config: Extract<VizConfig.T, { vizType: "bar" | "line" | "area" }>;
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): Extract<VizConfig.NameBound, { vizType: "bar" | "line" | "area" }> {
  const { config, getSlotQueryResultColumnName } = options;
  return {
    ...config,
    xAxisKey: getSlotQueryResultColumnName({
      key: config.xAxisKey,
      target: "xAxisKey",
    }),
    series: _mapSeries({ series: config.series, getSlotQueryResultColumnName }),
  };
}

function _mapCategoryConfig(
  options: Readonly<{
    config: Extract<VizConfig.T, { vizType: "pie" | "funnel" }>;
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): Extract<VizConfig.NameBound, { vizType: "pie" | "funnel" }> {
  const { config, getSlotQueryResultColumnName } = options;
  return {
    ...config,
    nameKey: getSlotQueryResultColumnName({
      key: config.nameKey,
      target: "nameKey",
    }),
    valueKey: getSlotQueryResultColumnName({
      key: config.valueKey,
      target: "valueKey",
    }),
  };
}

function _mapConfig(
  options: Readonly<{
    config: Readonly<VizConfig.T>;
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): VizConfig.NameBound {
  const { config, getSlotQueryResultColumnName } = options;
  return match(config)
    .with({ vizType: "table" }, identity)
    .with(
      { vizType: "bar" },
      { vizType: "line" },
      { vizType: "area" },
      (chart) => {
        return _mapXYConfig({ config: chart, getSlotQueryResultColumnName });
      },
    )
    .with({ vizType: "radar" }, (chart) => {
      return {
        ...chart,
        nameKey: getSlotQueryResultColumnName({
          key: chart.nameKey,
          target: "nameKey",
        }),
        series: _mapSeries({
          series: chart.series,
          getSlotQueryResultColumnName,
        }),
      };
    })
    .with({ vizType: "scatter" }, (chart) => {
      return {
        ...chart,
        series: _mapScatterSeries({
          series: chart.series,
          getSlotQueryResultColumnName,
        }),
      };
    })
    .with({ vizType: "bubble" }, (chart) => {
      return {
        ...chart,
        series: _mapBubbleSeries({
          series: chart.series,
          getSlotQueryResultColumnName,
        }),
      };
    })
    .with({ vizType: "pie" }, { vizType: "funnel" }, (chart) => {
      return _mapCategoryConfig({
        config: chart,
        getSlotQueryResultColumnName,
      });
    })
    .exhaustive();
}

/**
 * Replaces each column ID in a chart config with that column's current
 * `QueryResult` column name, the row key the renderer reads. Leaves the saved
 * config unchanged.
 */
export function makeNameBoundVizConfigFromVizConfig({
  config,
  columns,
}: Readonly<{
  config: Readonly<VizConfig.T>;
  columns: readonly QueryResult.ColumnWithId[];
}>): {
  config: VizConfig.NameBound;
  issues: QueryResultColumnBindingIssue[];
} {
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
  const getSlotQueryResultColumnName: GetSlotQueryResultColumnName = ({
    target,
  }) => {
    return slots.find(propEq("target", target))?.name;
  };
  return {
    config: _mapConfig({ config, getSlotQueryResultColumnName }),
    issues: slots.map(prop("issue")).filter(isDefined),
  };
}
