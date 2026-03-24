import { hasDefinedProps } from "@utils/guards/hasDefinedProps/hasDefinedProps";
import { objectKeys } from "@utils/objects/objectKeys";
import type { UnknownObject } from "@utils/types/common.types";
import type { StringKeyOf } from "@utils/types/utilities.types";

/**
 * Transforms an array of objects (rows) into an object where each key
 * is a column name and the value is an array of values for that column.
 *
 * @param rows - The array of objects to transform.
 * @returns An object where each key is a column name and the value is
 * an array of values for that column.
 */
export function rowsToColumns<T extends UnknownObject>(
  rows: readonly T[],
): {
  [K in StringKeyOf<T>]: Array<T[K]>;
} {
  const columnValues = {} as {
    [K in StringKeyOf<T>]: Array<T[K]>;
  };
  rows.forEach((row) => {
    objectKeys(row).forEach((key) => {
      const value = row[key];
      if (hasDefinedProps(columnValues, key)) {
        columnValues[key].push(value);
      } else {
        columnValues[key] = [value];
      }
    });
  });
  return columnValues;
}
