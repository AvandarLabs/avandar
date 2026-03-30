import { isNonEmptyArray } from "@utils/guards/isNonEmptyArray/isNonEmptyArray.ts";
import { QueryColumns } from "$/models/queries/QueryColumn/QueryColumns.ts";
import type {
  PartialStructuredQuery,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

type PieAxesConfig = {
  nameKey: string | undefined;
  valueKey: string | undefined;
};

/**
 * Hydrate `nameKey` and `valueKey` from a structured query's columns.
 *
 * Clears any existing key that no longer appears in the query, then fills
 * undefined keys: `valueKey` ← first numeric column; `nameKey` ← first
 * non-numeric column that is not the value key.
 *
 * @param currVizConfig The current pie-like viz config.
 * @param query The structured query to hydrate from.
 * @returns Updated config with hydrated keys.
 */
export function hydratePieFromQuery<VConfig extends PieAxesConfig>(
  currVizConfig: VConfig,
  query: PartialStructuredQuery,
): VConfig {
  const { queryColumns } = query;

  const isNameKeyValid = queryColumns.some((col) => {
    return QueryColumns.getDerivedColumnName(col) === currVizConfig.nameKey;
  });
  const isValueKeyValid = queryColumns.some((col) => {
    return QueryColumns.getDerivedColumnName(col) === currVizConfig.valueKey;
  });

  let next: VConfig = {
    ...currVizConfig,
    nameKey: isNameKeyValid ? currVizConfig.nameKey : undefined,
    valueKey: isValueKeyValid ? currVizConfig.valueKey : undefined,
  };

  if (
    (next.nameKey === undefined || next.valueKey === undefined) &&
    isNonEmptyArray(queryColumns)
  ) {
    if (next.valueKey === undefined) {
      const firstNumericCol = queryColumns.find(QueryColumns.isNumeric);
      next = {
        ...next,
        valueKey: firstNumericCol ?
          QueryColumns.getDerivedColumnName(firstNumericCol)
        : undefined,
      };
    }

    if (next.nameKey === undefined) {
      const valueKey = next.valueKey;
      const firstNonNumericCol = queryColumns.find((col) => {
        return (
          !QueryColumns.isNumeric(col) &&
          QueryColumns.getDerivedColumnName(col) !== valueKey
        );
      });
      const fallbackCol = queryColumns.find((col) => {
        return QueryColumns.getDerivedColumnName(col) !== valueKey;
      });
      const nameCol = firstNonNumericCol ?? fallbackCol;
      next = {
        ...next,
        nameKey: nameCol ?
          QueryColumns.getDerivedColumnName(nameCol)
        : undefined,
      };
    }
  }

  return next;
}
