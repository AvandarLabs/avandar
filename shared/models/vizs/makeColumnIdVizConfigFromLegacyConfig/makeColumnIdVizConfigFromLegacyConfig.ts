import { identity, isDefined, prop, propEq } from "@avandar/utils";
import { match } from "ts-pattern";
import { getColumnIdFromLegacyName } from "$/models/queries/QueryColumnBindings/getColumnIdFromLegacyName/getColumnIdFromLegacyName.ts";
import { makeColumnSlotsFromVizConfig } from "$/models/vizs/makeColumnSlotsFromVizConfig.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { ColumnBindingIssue } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { ColumnIdVizConfig } from "$/models/vizs/ColumnIdVizConfig/ColumnIdVizConfig.ts";
import type { VizColumnSlot } from "$/models/vizs/makeColumnSlotsFromVizConfig.ts";

type GetSlotColumnId = ({
  key,
  target,
}: Readonly<{
  key: string | undefined;
  target: string;
}>) => QueryColumn.Id | undefined;

function _mapSeries<Series extends { key: string }>(
  options: Readonly<{
    series: readonly Series[];
    getSlotColumnId: GetSlotColumnId;
  }>,
): Array<Series & { key: QueryColumn.Id }> {
  return options.series.flatMap((series, index) => {
    const key = options.getSlotColumnId({
      key: series.key,
      target: `series.${index}.key`,
    });
    return key === undefined ? [] : [{ ...series, key }];
  });
}

function _mapScatterSeries(
  options: Readonly<{
    series: Readonly<
      Extract<ColumnIdVizConfig.Legacy, { vizType: "scatter" }>["series"]
    >;
    getSlotColumnId: GetSlotColumnId;
  }>,
): ColumnIdVizConfig.ScatterSeries[] {
  return options.series.flatMap((series, index) => {
    const key = options.getSlotColumnId({
      key: series.key,
      target: `series.${index}.key`,
    });
    const xKey = options.getSlotColumnId({
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
    series: Readonly<
      Extract<ColumnIdVizConfig.Legacy, { vizType: "bubble" }>["series"]
    >;
    getSlotColumnId: GetSlotColumnId;
  }>,
): ColumnIdVizConfig.BubbleSeries[] {
  return options.series.flatMap((series, index) => {
    const key = options.getSlotColumnId({
      key: series.key,
      target: `series.${index}.key`,
    });
    const xKey = options.getSlotColumnId({
      key: series.xKey,
      target: `series.${index}.xKey`,
    });
    const sizeKey = options.getSlotColumnId({
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
    config: Extract<
      ColumnIdVizConfig.Legacy,
      { vizType: "bar" | "line" | "area" }
    >;
    getSlotColumnId: GetSlotColumnId;
  }>,
): Extract<ColumnIdVizConfig.T, { vizType: "bar" | "line" | "area" }> {
  const { config, getSlotColumnId } = options;
  return {
    ...config,
    xAxisKey: getSlotColumnId({ key: config.xAxisKey, target: "xAxisKey" }),
    series: _mapSeries({ series: config.series, getSlotColumnId }),
  };
}

function _mapCategoryConfig(
  options: Readonly<{
    config: Extract<ColumnIdVizConfig.Legacy, { vizType: "pie" | "funnel" }>;
    getSlotColumnId: GetSlotColumnId;
  }>,
): Extract<ColumnIdVizConfig.T, { vizType: "pie" | "funnel" }> {
  const { config, getSlotColumnId } = options;
  return {
    ...config,
    nameKey: getSlotColumnId({ key: config.nameKey, target: "nameKey" }),
    valueKey: getSlotColumnId({ key: config.valueKey, target: "valueKey" }),
  };
}

function _mapConfig(
  options: Readonly<{
    config: Readonly<ColumnIdVizConfig.Legacy>;
    getSlotColumnId: GetSlotColumnId;
  }>,
): ColumnIdVizConfig.T {
  const { config, getSlotColumnId } = options;
  return match(config)
    .with({ vizType: "table" }, identity)
    .with(
      { vizType: "bar" },
      { vizType: "line" },
      { vizType: "area" },
      (chart) => {
        return _mapXYConfig({ config: chart, getSlotColumnId });
      },
    )
    .with({ vizType: "radar" }, (chart) => {
      return {
        ...chart,
        nameKey: getSlotColumnId({ key: chart.nameKey, target: "nameKey" }),
        series: _mapSeries({ series: chart.series, getSlotColumnId }),
      };
    })
    .with({ vizType: "scatter" }, (chart) => {
      return {
        ...chart,
        series: _mapScatterSeries({ series: chart.series, getSlotColumnId }),
      };
    })
    .with({ vizType: "bubble" }, (chart) => {
      return {
        ...chart,
        series: _mapBubbleSeries({ series: chart.series, getSlotColumnId }),
      };
    })
    .with({ vizType: "pie" }, { vizType: "funnel" }, (chart) => {
      return _mapCategoryConfig({ config: chart, getSlotColumnId });
    })
    .exhaustive();
}

function _bindSlotToColumnId({
  slot,
  columns,
}: {
  slot: VizColumnSlot<string>;
  columns: readonly QueryResult.ColumnWithId[];
}): {
  target: string;
  id: QueryColumn.Id | undefined;
  issue: ColumnBindingIssue | undefined;
} {
  const id =
    slot.key === undefined
      ? undefined
      : getColumnIdFromLegacyName({ name: slot.key, columns });
  const hasCandidate =
    slot.key !== undefined &&
    columns.some((column) => {
      return column.name.toLowerCase() === slot.key!.toLowerCase();
    });
  return {
    target: slot.target,
    id,
    issue:
      slot.key !== undefined && id === undefined
        ? {
            target: slot.target,
            reason: hasCandidate ? "ambiguous" : "missing",
          }
        : undefined,
  };
}

/**
 * Replaces each legacy column name in a chart config with the column ID of the
 * one output column that has that name. Leaves the saved input unchanged.
 */
export function makeColumnIdVizConfigFromLegacyConfig({
  config,
  columns,
}: Readonly<{
  config: Readonly<ColumnIdVizConfig.Legacy>;
  columns: readonly QueryResult.ColumnWithId[];
}>): { config: ColumnIdVizConfig.T; issues: ColumnBindingIssue[] } {
  const slots = makeColumnSlotsFromVizConfig(config).map((slot) => {
    return _bindSlotToColumnId({ slot, columns });
  });
  const getSlotColumnId: GetSlotColumnId = ({ target }) => {
    return slots.find(propEq("target", target))?.id;
  };
  return {
    config: _mapConfig({ config, getSlotColumnId }),
    issues: slots.map(prop("issue")).filter(isDefined),
  };
}
