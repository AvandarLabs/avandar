import { identity, propEq } from "@avandar/utils";
import { match } from "ts-pattern";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { ResultBindingRegistry } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.ts";

function _createTransitionMap({
  previous,
  current,
}: {
  previous: ResultBindingRegistry;
  current: ResultBindingRegistry;
}): Map<QueryColumn.Id, QueryColumn.Id> {
  const mappings = new Map<QueryColumn.Id, QueryColumn.Id>();
  if (previous.scopeKey !== current.scopeKey) {
    return mappings;
  }
  previous.columns.forEach((column) => {
    if (
      !column.sqlExpressionKey ||
      column.expressionKey !== column.sqlExpressionKey
    ) {
      return;
    }
    const oldMatches = previous.columns.filter(
      propEq("sqlExpressionKey", column.sqlExpressionKey),
    );
    const newMatches = current.columns.filter((candidate) => {
      return (
        candidate.sqlExpressionKey === column.sqlExpressionKey &&
        candidate.expressionKey !== candidate.sqlExpressionKey
      );
    });
    const matches =
      oldMatches.length === 1 && newMatches.length === 1
        ? newMatches
        : newMatches.filter((candidate) => {
            return (
              candidate.name === column.name &&
              oldMatches.filter(propEq("name", column.name)).length === 1
            );
          });
    if (matches.length === 1) {
      mappings.set(column.id, matches[0]!.id);
    }
  });
  return mappings;
}

/**
 * Migrates owned provisional IDs using unique expression proof, preserving
 * unresolved slots.
 */
export function rebindProvisionalVizConfig({
  config,
  previous,
  current,
}: Readonly<{
  config: VizConfig.T;
  previous: ResultBindingRegistry;
  current: ResultBindingRegistry;
}>): VizConfig.T {
  const mappings = _createTransitionMap({
    previous: previous,
    current: current,
  });
  const mapKey = (id: QueryColumn.Id | undefined) => {
    return id ? (mappings.get(id) ?? id) : undefined;
  };
  if (mappings.size === 0) {
    return config;
  }
  return match(config)
    .with({ vizType: "table" }, identity)
    .with({ vizType: "pie" }, { vizType: "funnel" }, (chart) => {
      return {
        ...chart,
        nameKey: mapKey(chart.nameKey),
        valueKey: mapKey(chart.valueKey),
      };
    })
    .with({ vizType: "scatter" }, (chart) => {
      return {
        ...chart,
        series: chart.series.map((series) => {
          return {
            ...series,
            key: mappings.get(series.key) ?? series.key,
            xKey: mappings.get(series.xKey) ?? series.xKey,
          };
        }),
      };
    })
    .with({ vizType: "bubble" }, (chart) => {
      return {
        ...chart,
        series: chart.series.map((series) => {
          return {
            ...series,
            key: mappings.get(series.key) ?? series.key,
            xKey: mappings.get(series.xKey) ?? series.xKey,
            sizeKey: mappings.get(series.sizeKey) ?? series.sizeKey,
          };
        }),
      };
    })
    .with({ vizType: "radar" }, (chart) => {
      return {
        ...chart,
        nameKey: mapKey(chart.nameKey),
        series: chart.series.map((series) => {
          return {
            ...series,
            key: mappings.get(series.key) ?? series.key,
          };
        }),
      };
    })
    .with(
      { vizType: "bar" },
      { vizType: "line" },
      { vizType: "area" },
      (chart) => {
        return {
          ...chart,
          xAxisKey: mapKey(chart.xAxisKey),
          series: chart.series.map((series) => {
            return {
              ...series,
              key: mappings.get(series.key) ?? series.key,
            };
          }),
        };
      },
    )
    .exhaustive();
}
