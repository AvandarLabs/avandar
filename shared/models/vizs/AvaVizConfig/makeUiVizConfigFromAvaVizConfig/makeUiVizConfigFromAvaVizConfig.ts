import {
  identity,
  isDefined,
  makeIdLookupMap,
  objectValuesMap,
  prop,
  propEq,
} from "@avandar/utils";
import { match } from "ts-pattern";
import { makeColumnSlotsFromAvaVizConfig } from "$/models/vizs/AvaVizConfig/makeColumnSlotsFromAvaVizConfig.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { QueryResultColumnBindingIssue } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types.ts";
import type { UiPluginVizConfig } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig.ts";
import type {
  AvaBubbleSeries,
  AvaRadarSeries,
  AvaScatterSeries,
  AvaXYSeries,
} from "$/models/vizs/series.types.ts";
import type {
  BuiltInUiVizConfig,
  UiVizConfig,
} from "$/models/vizs/UiVizConfig/UiVizConfig.types.ts";

type ConversionOptions<TConfig> = Readonly<{
  config: Readonly<TConfig>;
  columns: readonly QueryResult.ColumnWithId[];
}>;

type Conversion<TConfig> = {
  config: TConfig;
  issues: QueryResultColumnBindingIssue[];
};

type GetSlotQueryResultColumnName = ({
  key,
  target,
}: Readonly<{
  key: QueryColumn.Id | undefined;
  target: string;
}>) => string | undefined;

type XYSeries = Extract<UiVizConfig, { vizType: "bar" }>["series"][number];

type RadarSeries = Extract<UiVizConfig, { vizType: "radar" }>["series"][number];

function _mapSeries(
  options: Readonly<{
    series: readonly AvaXYSeries[];
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): XYSeries[];
function _mapSeries(
  options: Readonly<{
    series: readonly AvaRadarSeries[];
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): RadarSeries[];
function _mapSeries(
  options: Readonly<{
    series: ReadonlyArray<AvaXYSeries | AvaRadarSeries>;
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): Array<XYSeries | RadarSeries> {
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
    series: readonly AvaScatterSeries[];
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): Extract<UiVizConfig, { vizType: "scatter" }>["series"] {
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
    series: readonly AvaBubbleSeries[];
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): Extract<UiVizConfig, { vizType: "bubble" }>["series"] {
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
    config: Extract<AvaVizConfig.T, { vizType: "bar" | "line" | "area" }>;
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): Extract<UiVizConfig, { vizType: "bar" | "line" | "area" }> {
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
    config: Extract<AvaVizConfig.T, { vizType: "pie" | "funnel" }>;
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): Extract<UiVizConfig, { vizType: "pie" | "funnel" }> {
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

function _mapPluginConfig(
  options: Readonly<{
    config: AvaVizConfig.Plugin;
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): UiPluginVizConfig {
  const { config, getSlotQueryResultColumnName } = options;
  return {
    ...config,
    columnSettings: objectValuesMap(
      config.columnSettings,
      (key, settingKey) => {
        return getSlotQueryResultColumnName({
          key,
          target: `columnSettings.${settingKey}`,
        });
      },
    ),
  };
}

function _mapConfig(
  options: Readonly<{
    config: Readonly<AvaVizConfig.T>;
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): UiVizConfig {
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
    .with({ vizType: "plugin" }, (chart) => {
      return _mapPluginConfig({ config: chart, getSlotQueryResultColumnName });
    })
    .exhaustive();
}

/**
 * Replaces each column ID in a chart config with that column's current
 * `QueryResult` column name, the row key the renderer reads. An ID that no
 * column has is returned in `issues` as missing, and its axis or column
 * setting is left unset or its series dropped. Leaves the saved config
 * unchanged. A built-in config always converts to a built-in config.
 *
 * Use it wherever a chart config must be read by name, for example to render
 * a chart or to write it into a URL.
 */
export function makeUiVizConfigFromAvaVizConfig(
  options: ConversionOptions<AvaVizConfig.BuiltIn>,
): Conversion<BuiltInUiVizConfig>;
export function makeUiVizConfigFromAvaVizConfig(
  options: ConversionOptions<AvaVizConfig.T>,
): Conversion<UiVizConfig>;
export function makeUiVizConfigFromAvaVizConfig({
  config,
  columns,
}: ConversionOptions<AvaVizConfig.T>): Conversion<UiVizConfig> {
  const columnsById = makeIdLookupMap(columns);
  const slots = makeColumnSlotsFromAvaVizConfig<QueryColumn.Id>(config).map(
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
