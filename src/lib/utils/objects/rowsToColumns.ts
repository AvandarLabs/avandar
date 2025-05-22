import { StringKeyOf } from "type-fest";
import { UnknownObject } from "@/lib/types/common";
import { hasDefinedProp } from "../guards";
import { objectKeys } from "./misc";

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
      if (hasDefinedProp(columnValues, key)) {
        columnValues[key].push(value);
      } else {
        columnValues[key] = [value];
      }
    });
  });
  return columnValues;
}
