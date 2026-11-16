import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { WhenFacts } from "@avandar/plugin-manifest/runtime";

/**
 * Makes the `when` facts of the `dataExplorer.toolbar` slot from a query
 * result's shape. A plugin command's `when` condition reads them to decide
 * whether it shows, such as a chart command that needs a numeric column.
 *
 * @param options The shape of the result the toolbar is showing.
 * @param options.hasResult Whether a settled result is on screen.
 * @param options.rowCount The number of rows in that result.
 * @param options.columns The columns of that result.
 * @returns The facts, with one count per kind of column a command can need.
 */
export function makeToolbarFactsFromQueryResult(options: {
  hasResult: boolean;
  rowCount: number;
  columns: readonly QueryResult.Column[];
}): WhenFacts {
  const { hasResult, rowCount, columns } = options;
  return {
    hasResult,
    rowCount,
    columnCount: columns.length,
    numericColumnCount: columns.filter((column) => {
      return AvaDataType.isNumeric(column.dataType);
    }).length,
    dateColumnCount: columns.filter((column) => {
      return AvaDataType.isDateOrTimestamp(column.dataType);
    }).length,
  };
}
