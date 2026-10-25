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
import type { ColumnBindingIssue } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { ColumnIdVizConfig } from "$/models/vizs/ColumnIdVizConfig/ColumnIdVizConfig.ts";

type GetSlotOutputName = ({
  key,
  target,
}: Readonly<{
  key: QueryColumn.Id | undefined;
  target: string;
}>) => string | undefined;

type OutputNameXYSeries = Extract<
  ColumnIdVizConfig.OutputNameKeyed,
  { vizType: "bar" }
>["series"][number];

type OutputNameRadarSeries = Extract<
  ColumnIdVizConfig.OutputNameKeyed,
  { vizType: "radar" }
>["series"][number];

function _mapSeries(
  options: Readonly<{
    series: readonly ColumnIdVizConfig.XYSeries[];
    getSlotOutputName: GetSlotOutputName;
  }>,
): OutputNameXYSeries[];
function _mapSeries(
  options: Readonly<{
    series: readonly ColumnIdVizConfig.RadarSeries[];
    getSlotOutputName: GetSlotOutputName;
  }>,
): OutputNameRadarSeries[];
function _mapSeries(
  options: Readonly<{
    series: ReadonlyArray<
      ColumnIdVizConfig.XYSeries | ColumnIdVizConfig.RadarSeries
    >;
    getSlotOutputName: GetSlotOutputName;
  }>,
): Array<OutputNameXYSeries | OutputNameRadarSeries> {
  return options.series.flatMap((series, index) => {
    const key = options.getSlotOutputName({
      key: series.key,
      target: `series.${index}.key`,
    });
    return key === undefined ? [] : [{ ...series, key }];
  });
}

function _mapScatterSeries(
  options: Readonly<{
    series: readonly ColumnIdVizConfig.ScatterSeries[];
    getSlotOutputName: GetSlotOutputName;
  }>,
): Extract<
  ColumnIdVizConfig.OutputNameKeyed,
  { vizType: "scatter" }
>["series"] {
  return options.series.flatMap((series, index) => {
    const key = options.getSlotOutputName({
      key: series.key,
      target: `series.${index}.key`,
    });
    const xKey = options.getSlotOutputName({
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
    series: readonly ColumnIdVizConfig.BubbleSeries[];
    getSlotOutputName: GetSlotOutputName;
  }>,
): Extract<ColumnIdVizConfig.OutputNameKeyed, { vizType: "bubble" }>["series"] {
  return options.series.flatMap((series, index) => {
    const key = options.getSlotOutputName({
      key: series.key,
      target: `series.${index}.key`,
    });
    const xKey = options.getSlotOutputName({
      key: series.xKey,
      target: `series.${index}.xKey`,
    });
    const sizeKey = options.getSlotOutputName({
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
    config: Extract<ColumnIdVizConfig.T, { vizType: "bar" | "line" | "area" }>;
    getSlotOutputName: GetSlotOutputName;
  }>,
): Extract<
  ColumnIdVizConfig.OutputNameKeyed,
  { vizType: "bar" | "line" | "area" }
> {
  const { config, getSlotOutputName } = options;
  return {
    ...config,
    xAxisKey: getSlotOutputName({ key: config.xAxisKey, target: "xAxisKey" }),
    series: _mapSeries({ series: config.series, getSlotOutputName }),
  };
}

function _mapCategoryConfig(
  options: Readonly<{
    config: Extract<ColumnIdVizConfig.T, { vizType: "pie" | "funnel" }>;
    getSlotOutputName: GetSlotOutputName;
  }>,
): Extract<ColumnIdVizConfig.OutputNameKeyed, { vizType: "pie" | "funnel" }> {
  const { config, getSlotOutputName } = options;
  return {
    ...config,
    nameKey: getSlotOutputName({ key: config.nameKey, target: "nameKey" }),
    valueKey: getSlotOutputName({ key: config.valueKey, target: "valueKey" }),
  };
}

function _mapConfig(
  options: Readonly<{
    config: Readonly<ColumnIdVizConfig.T>;
    getSlotOutputName: GetSlotOutputName;
  }>,
): ColumnIdVizConfig.OutputNameKeyed {
  const { config, getSlotOutputName } = options;
  return match(config)
    .with({ vizType: "table" }, identity)
    .with(
      { vizType: "bar" },
      { vizType: "line" },
      { vizType: "area" },
      (chart) => {
        return _mapXYConfig({ config: chart, getSlotOutputName });
      },
    )
    .with({ vizType: "radar" }, (chart) => {
      return {
        ...chart,
        nameKey: getSlotOutputName({ key: chart.nameKey, target: "nameKey" }),
        series: _mapSeries({ series: chart.series, getSlotOutputName }),
      };
    })
    .with({ vizType: "scatter" }, (chart) => {
      return {
        ...chart,
        series: _mapScatterSeries({ series: chart.series, getSlotOutputName }),
      };
    })
    .with({ vizType: "bubble" }, (chart) => {
      return {
        ...chart,
        series: _mapBubbleSeries({ series: chart.series, getSlotOutputName }),
      };
    })
    .with({ vizType: "pie" }, { vizType: "funnel" }, (chart) => {
      return _mapCategoryConfig({ config: chart, getSlotOutputName });
    })
    .exhaustive();
}

/**
 * Replaces each column ID in a chart config with that column's current output
 * name, the row key the renderer reads. Leaves the saved config unchanged.
 */
export function makeOutputNameVizConfigFromColumnIdConfig({
  config,
  columns,
}: Readonly<{
  config: Readonly<ColumnIdVizConfig.T>;
  columns: readonly QueryResult.ColumnWithId[];
}>): {
  config: ColumnIdVizConfig.OutputNameKeyed;
  issues: ColumnBindingIssue[];
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
  const getSlotOutputName: GetSlotOutputName = ({ target }) => {
    return slots.find(propEq("target", target))?.name;
  };
  return {
    config: _mapConfig({ config, getSlotOutputName }),
    issues: slots.map(prop("issue")).filter(isDefined),
  };
}
