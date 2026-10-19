import { identity, isDefined, prop, propEq } from "@avandar/utils";
import { match } from "ts-pattern";
import { getColumnIdFromLegacyName } from "$/models/queries/QueryColumnBindings/getColumnIdFromLegacyName/getColumnIdFromLegacyName.ts";
import { makeColumnSlotsFromVizConfig } from "$/models/vizs/makeColumnSlotsFromVizConfig.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { BindingIssue } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { BoundVizConfig } from "$/models/vizs/BoundVizConfig/BoundVizConfig.ts";
import type { VizColumnSlot } from "$/models/vizs/makeColumnSlotsFromVizConfig.ts";

type ColumnBinding = ({
  key,
  target,
}: Readonly<{
  key: string | undefined;
  target: string;
}>) => QueryColumn.Id | undefined;

function _mapSeries<Series extends { key: string }>(
  options: Readonly<{
    series: readonly Series[];
    bindColumn: ColumnBinding;
  }>,
): Array<Series & { key: QueryColumn.Id }> {
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
    series: Readonly<
      Extract<BoundVizConfig.Legacy, { vizType: "scatter" }>["series"]
    >;
    bindColumn: ColumnBinding;
  }>,
): BoundVizConfig.ScatterSeries[] {
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
    series: Readonly<
      Extract<BoundVizConfig.Legacy, { vizType: "bubble" }>["series"]
    >;
    bindColumn: ColumnBinding;
  }>,
): BoundVizConfig.BubbleSeries[] {
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
    xAxisKey: bindColumn({ key: config.xAxisKey, target: "xAxisKey" }),
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
    nameKey: bindColumn({ key: config.nameKey, target: "nameKey" }),
    valueKey: bindColumn({ key: config.valueKey, target: "valueKey" }),
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

function _bindSlot({
  slot,
  columns,
}: {
  slot: VizColumnSlot<string>;
  columns: readonly QueryResult.BoundColumn[];
}): {
  target: string;
  id: QueryColumn.Id | undefined;
  issue: BindingIssue | undefined;
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

/** Binds unique legacy column names without modifying the saved input. */
export function makeBoundVizConfigFromLegacyConfig({
  config,
  columns,
}: Readonly<{
  config: Readonly<BoundVizConfig.Legacy>;
  columns: readonly QueryResult.BoundColumn[];
}>): { config: BoundVizConfig.T; issues: BindingIssue[] } {
  const slots = makeColumnSlotsFromVizConfig(config).map((slot) => {
    return _bindSlot({ slot, columns });
  });
  const bindColumn: ColumnBinding = ({ target }) => {
    return slots.find(propEq("target", target))?.id;
  };
  return {
    config: _mapConfig({ config, bindColumn }),
    issues: slots.map(prop("issue")).filter(isDefined),
  };
}
