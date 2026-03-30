import { assertIsDefined } from "@utils/asserts/assertIsDefined/assertIsDefined";
import { doesRowPassFilters } from "@utils/filters/doesRowPassFilters/doesRowPassFilters";
import { doesValuePassFilters } from "@utils/filters/doesValuePassFilters/doesValuePassFilters";
import { isEmptyFiltersObject } from "@utils/filters/isEmptyFiltersObject/isEmptyFiltersObject";
import { isFiltersByOperatorObject } from "@utils/filters/isFiltersByOperatorObject/isFiltersByOperatorObject";
import { objectKeys } from "@utils/objects/objectKeys";
import { assertDexieColumnsAreIndexed } from "@/clients/dexie/dexieColumnIsIndexed";
import type {
  FilterOperatorRecord,
  FiltersByColumn,
} from "@utils/filters/filters";
import type { UnknownObject } from "@utils/types/common.types";
import type { Collection, IndexableType, IndexSpec, Table } from "dexie";

/**
 * Returns the Dexie `orderBy` index name for the table primary key.
 */
export function dexiePrimaryKeyOrderByName(primKey: IndexSpec): string {
  const { keyPath } = primKey;

  if (keyPath === undefined) {
    throw new Error("Dexie primary key has no keyPath.");
  }

  if (typeof keyPath === "string") {
    return keyPath;
  }

  return `[${keyPath.join("+")}]`;
}

function _getActiveFilterColumnNames<T extends UnknownObject>(
  where: FiltersByColumn<T>,
): string[] {
  return objectKeys(where).filter((column) => {
    const record = where[column];

    if (!record) {
      return false;
    }

    return objectKeys(record).some((operatorKey) => {
      return (
        record[operatorKey as keyof FilterOperatorRecord<T[keyof T]>] !==
        undefined
      );
    });
  }) as string[];
}

function _whereHasEmptyInOnly<T extends UnknownObject>(
  where: FiltersByColumn<T>,
  column: string,
): boolean {
  const record = where[column as keyof T];

  if (!record) {
    return false;
  }

  const hasEq = record.eq !== undefined;
  const inValues = record.in;

  if (hasEq) {
    return false;
  }

  return Array.isArray(inValues) && inValues.length === 0;
}

function _applyFirstColumnWhere<T extends UnknownObject>(
  dbTable: Table<T, IndexableType>,
  column: string,
  record: FilterOperatorRecord<T[keyof T]>,
): Collection<T> {
  const hasEq = record.eq !== undefined;
  const inValues = record.in;
  const hasIn = Array.isArray(inValues) && inValues.length > 0;
  const hasEmptyIn = Array.isArray(inValues) && inValues.length === 0;

  if (hasEmptyIn && !hasEq) {
    return dbTable.toCollection().limit(0);
  }

  if (hasEq && hasIn) {
    let collection = dbTable.where(column).equals(record.eq as IndexableType);

    collection = collection.filter((row) => {
      return doesValuePassFilters(row[column as keyof T], "in", inValues);
    });

    return collection;
  }

  if (hasEq) {
    return dbTable.where(column).equals(record.eq as IndexableType);
  }

  if (hasIn) {
    return dbTable.where(column).anyOf(inValues as IndexableType[]);
  }

  return dbTable.toCollection().limit(0);
}

/**
 * Validates `where` and returns a Dexie collection narrowed by indexed queries
 * (and `.filter` for additional predicates). Does not call `toArray`.
 */
export function buildFilteredDexieCollection<T extends UnknownObject>(
  tableName: string,
  dbTable: Table<T, IndexableType>,
  where: FiltersByColumn<T> | undefined,
): Collection<T> {
  if (!where || isEmptyFiltersObject(where)) {
    return dbTable.toCollection();
  }

  if (isFiltersByOperatorObject(where)) {
    throw new Error(
      `Dexie table "${tableName}": FiltersByOperator is not supported; ` +
        `use FiltersByColumn with indexed columns only.`,
    );
  }

  const activeColumns = _getActiveFilterColumnNames(where);

  if (activeColumns.length === 0) {
    return dbTable.toCollection();
  }

  if (
    activeColumns.some((column) => {
      return _whereHasEmptyInOnly(where, column);
    })
  ) {
    return dbTable.toCollection().limit(0);
  }

  assertDexieColumnsAreIndexed(tableName, dbTable, activeColumns);

  const sortedColumns = [...activeColumns].sort();
  const firstColumn = sortedColumns[0];
  assertIsDefined(firstColumn);

  const firstRecord = where[firstColumn as keyof T];
  assertIsDefined(firstRecord);

  const collection = _applyFirstColumnWhere(dbTable, firstColumn, firstRecord);

  const remainingFilters = objectKeys(where).reduce<FiltersByColumn<T>>(
    (acc, column) => {
      if (column === firstColumn) {
        return acc;
      }

      const operatorRecord = where[column];

      if (!operatorRecord) {
        return acc;
      }

      return {
        ...acc,
        [column]: operatorRecord,
      };
    },
    {},
  );

  if (isEmptyFiltersObject(remainingFilters)) {
    return collection;
  }

  return collection.filter((row) => {
    return doesRowPassFilters(row, remainingFilters);
  });
}

/**
 * Finds the first row matching all `columnNames` on `newRow`, using an
 * indexed `where` on the lexicographically first column.
 */
export async function findFirstConflictingRowByIndexedColumns<
  T extends Record<string, unknown>,
>(
  tableName: string,
  dbTable: Table<T, IndexableType>,
  newRow: T,
  columnNames: readonly string[],
): Promise<T | undefined> {
  assertDexieColumnsAreIndexed(tableName, dbTable, columnNames);

  const sorted = [...columnNames].sort();
  const firstCol = sorted[0];
  assertIsDefined(firstCol);

  const firstVal = newRow[firstCol];
  let collection = dbTable.where(firstCol).equals(firstVal as IndexableType);

  if (columnNames.length > 1) {
    collection = collection.filter((row) => {
      return columnNames.every((column) => {
        return Object.is(row[column], newRow[column]);
      });
    });
  }

  return collection.first();
}
