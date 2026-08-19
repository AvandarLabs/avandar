import { matchLiteral } from "@avandar/utils";
import { quoteSqlIdentifier } from "@utils/sql/index.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { FilterPredicateParts } from "$/models/queries/StructuredQuery/renderFilterRule/renderFilterRule.types.ts";

/**
 * The SQL type a temporal column's bindings are cast to. Takes only the
 * temporal types: a non-temporal column binds its value directly, so there is
 * no cast to name.
 */
function _getCastTargetFromDataType(
  dataType: "date" | "timestamp" | "time",
): string {
  return matchLiteral(dataType, {
    date: "DATE",
    timestamp: "TIMESTAMP",
    time: "TIME",
  });
}

/**
 * The quoted column, the comparison target, and the bind placeholder for one
 * rule.
 *
 * Case folding has to be applied to both sides or neither, and a temporal
 * binding has to be cast on the placeholder side only, so both decisions are
 * made here once rather than per operator.
 */
export function getFilterPredicateParts(
  options: Readonly<{
    columnName: string;
    dataType: AvaDataTypeNs.T | undefined;
    foldCase: boolean;
  }>,
): FilterPredicateParts {
  const { columnName, dataType, foldCase } = options;
  const column = quoteSqlIdentifier(columnName);
  return {
    column,
    leftSide: foldCase ? `lower(${column})` : column,
    placeholder:
      dataType !== undefined && AvaDataType.isTemporal(dataType) ?
        `CAST(? AS ${_getCastTargetFromDataType(dataType)})`
      : foldCase ? "lower(?)"
      : "?",
  };
}
