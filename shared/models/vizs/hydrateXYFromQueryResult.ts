import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";

type XYAxesConfig = {
  xAxisKey: string | undefined;
  yAxisKey: string | undefined;
};

/**
 * Which XY chart is being configured — affects default X column priority.
 */
export type XYVizChartKind = "bar" | "line" | "scatter";

/**
 * Hydrate X/Y axis keys from query result column metadata when keys are
 * undefined. Does not overwrite keys that are already set. X is inferred only
 * after Y is set (a numeric Y is required before choosing X).
 *
 * @param currVizConfig Current viz config (bar, line, or scatter).
 * @param columns Result columns with names and `AvaDataType`.
 * @param chartKind Bar/line prefer temporal or text on X; scatter prefers a
 * second numeric for X when available.
 * @returns Updated config with any newly inferred axis keys.
 */
export function hydrateXYFromQueryResult<VConfig extends XYAxesConfig>(
  currVizConfig: VConfig,
  columns: readonly QueryResultColumn[],
  chartKind: XYVizChartKind,
): VConfig {
  if (columns.length === 0) {
    return currVizConfig;
  }

  let next: VConfig = { ...currVizConfig };

  if (next.yAxisKey === undefined) {
    const yName = _pickFirstNumericColumnName(columns);
    if (yName !== undefined) {
      next = { ...next, yAxisKey: yName };
    }
  }

  const yKey = next.yAxisKey;

  if (next.xAxisKey === undefined && yKey !== undefined) {
    const xName =
      chartKind === "scatter" ?
        _pickScatterXColumnName(columns, yKey)
      : _pickBarLineXColumnName(columns, yKey);
    if (xName !== undefined) {
      next = { ...next, xAxisKey: xName };
    }
  }

  return next;
}

function _pickFirstNumericColumnName(
  columns: readonly QueryResultColumn[],
): string | undefined {
  const col = columns.find((c) => {
    return AvaDataType.isNumeric(c.dataType);
  });
  return col?.name;
}

/**
 * Bar and line: prefer temporal, then text, then boolean as category, then a
 * second numeric so two-metric results still chart.
 */
function _pickBarLineXColumnName(
  columns: readonly QueryResultColumn[],
  yKey: string | undefined,
): string | undefined {
  const others = columns.filter((c) => {
    return c.name !== yKey;
  });
  const temporal = others.find((c) => {
    return AvaDataType.isTemporal(c.dataType);
  });
  if (temporal !== undefined) {
    return temporal.name;
  }
  const text = others.find((c) => {
    return AvaDataType.isText(c.dataType);
  });
  if (text !== undefined) {
    return text.name;
  }
  const booleanCol = others.find((c) => {
    return c.dataType === "boolean";
  });
  if (booleanCol !== undefined) {
    return booleanCol.name;
  }
  const numeric = others.find((c) => {
    return AvaDataType.isNumeric(c.dataType);
  });
  if (numeric !== undefined) {
    return numeric.name;
  }
  return others[0]?.name;
}

/**
 * Scatter: prefer a second numeric for X; otherwise temporal or text.
 */
function _pickScatterXColumnName(
  columns: readonly QueryResultColumn[],
  yKey: string | undefined,
): string | undefined {
  const others = columns.filter((c) => {
    return c.name !== yKey;
  });
  const numericX = others.find((c) => {
    return AvaDataType.isNumeric(c.dataType);
  });
  if (numericX !== undefined) {
    return numericX.name;
  }
  const temporal = others.find((c) => {
    return AvaDataType.isTemporal(c.dataType);
  });
  if (temporal !== undefined) {
    return temporal.name;
  }
  const text = others.find((c) => {
    return AvaDataType.isText(c.dataType);
  });
  if (text !== undefined) {
    return text.name;
  }
  return others[0]?.name;
}
