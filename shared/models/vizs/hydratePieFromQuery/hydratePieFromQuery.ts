import { isNonEmptyArray } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

type PieAxesConfig = {
  nameKey: QueryColumn.Id | undefined;
  valueKey: QueryColumn.Id | undefined;
};

/**
 * Fills the empty name and value slots of a config such as a pie or funnel
 * chart from a structured query's columns: the first numeric column for the
 * value and another column, preferably non-numeric, for the name. Set slots
 * keep their column ID, even when the query no longer selects that column.
 *
 * Use it so a chart has something to draw before the user assigns its
 * columns, for example after the query's selected columns change.
 */
export function hydratePieFromQuery<VConfig extends PieAxesConfig>(
  currVizConfig: VConfig,
  query: PartialStructuredQuery,
): VConfig {
  const { queryColumns } = query;

  let next: VConfig = {
    ...currVizConfig,
    nameKey: currVizConfig.nameKey,
    valueKey: currVizConfig.valueKey,
  };

  if (
    (next.nameKey === undefined || next.valueKey === undefined) &&
    isNonEmptyArray(queryColumns)
  ) {
    if (next.valueKey === undefined) {
      const firstNumericCol = queryColumns.find(QueryColumn.isNumeric);
      next = {
        ...next,
        valueKey: firstNumericCol ? firstNumericCol.id : undefined,
      };
    }

    if (next.nameKey === undefined) {
      const valueKey = next.valueKey;
      const firstNonNumericCol = queryColumns.find((col) => {
        return !QueryColumn.isNumeric(col) && col.id !== valueKey;
      });
      const fallbackCol = queryColumns.find((col) => {
        return col.id !== valueKey;
      });
      const nameCol = firstNonNumericCol ?? fallbackCol;
      next = {
        ...next,
        nameKey: nameCol ? nameCol.id : undefined,
      };
    }
  }

  return next;
}
