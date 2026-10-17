import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { ResultBindingRegistry } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.ts";

function _createTransitionMap(
  previous: ResultBindingRegistry,
  current: ResultBindingRegistry,
): Map<QueryColumn.Id, QueryColumn.Id> {
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
    const oldMatches = previous.columns.filter((candidate) => {
      return candidate.sqlExpressionKey === column.sqlExpressionKey;
    });
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
              oldMatches.filter((old) => {
                return old.name === column.name;
              }).length === 1
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
export function rebindProvisionalVizConfig(
  config: VizConfig.T,
  previous: ResultBindingRegistry,
  current: ResultBindingRegistry,
): VizConfig.T {
  const mappings = _createTransitionMap(previous, current);
  const mapKey = (id: QueryColumn.Id | undefined) => {
    return id ? (mappings.get(id) ?? id) : undefined;
  };
  if (config.vizType === "table" || mappings.size === 0) {
    return config;
  }
  if (config.vizType === "pie" || config.vizType === "funnel") {
    return {
      ...config,
      nameKey: mapKey(config.nameKey),
      valueKey: mapKey(config.valueKey),
    };
  }
  if (config.vizType === "scatter" || config.vizType === "bubble") {
    return {
      ...config,
      series: config.series.map((series) => {
        return {
          ...series,
          key: mapKey(series.key)!,
          xKey: mapKey(series.xKey)!,
          ...("sizeKey" in series ? { sizeKey: mapKey(series.sizeKey)! } : {}),
        };
      }),
    } as VizConfig.T;
  }
  const series = config.series.map((item) => {
    return { ...item, key: mapKey(item.key)! };
  });
  return config.vizType === "radar"
    ? { ...config, nameKey: mapKey(config.nameKey), series }
    : ({ ...config, xAxisKey: mapKey(config.xAxisKey), series } as VizConfig.T);
}
