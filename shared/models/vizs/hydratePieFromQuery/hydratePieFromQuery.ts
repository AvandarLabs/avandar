import { isNonEmptyArray } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

type PieAxesConfig = {
  nameKey: QueryColumn.Id | undefined;
  valueKey: QueryColumn.Id | undefined;
};

/**
 * Seeds unconfigured slots from column IDs and preserves existing selections
 * and styles, including identities absent from the current result.
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
