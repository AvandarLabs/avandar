import type {
  DexieCrudOperationContext,
  DexieKey,
} from "@/clients/dexie/createDexieCrudClient/createDexieCrudClient.types";
import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";
import type { DexieDBType } from "@/clients/dexie/DexieDBVersionManager";
import type { FiltersByColumn } from "@avandar/utils";
import type { Collection, IndexableType, IndexSpec, Table } from "dexie";

import {
  buildFilteredDexieCollection,
  findFirstConflictingRowByIndexedColumns,
} from "@/clients/dexie/dexieFilteredCollection";

/**
 * Reads the IndexedDB primary key value from a row using the table key path.
 */
function _extractPrimaryKeyFromRow(
  row: Record<string, unknown>,
  primKey: IndexSpec,
): IndexableType | undefined {
  const { keyPath } = primKey;
  if (keyPath === undefined) {
    return undefined;
  }
  if (typeof keyPath === "string") {
    return row[keyPath] as IndexableType;
  }
  return keyPath.map((key) => {
    return row[key];
  }) as IndexableType;
}

/**
 * Returns whether two rows match on every `onConflict.columnNames` field.
 */
export function rowsMatchOnConflictColumns(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  columnNames: readonly string[],
): boolean {
  return columnNames.every((col) => {
    return Object.is(a[col], b[col]);
  });
}

/**
 * Returns the first stored row that conflicts with `newRow` on `columnNames`.
 */
export function findConflictingRow<T extends Record<string, unknown>>(
  rows: readonly T[],
  newRow: T,
  columnNames: readonly string[],
): T | undefined {
  return rows.find((row) => {
    return rowsMatchOnConflictColumns(row, newRow, columnNames);
  });
}

/**
 * Returns whether `columnNames` matches the table primary key path exactly.
 */
export function isPrimaryKeyConflictColumns(
  columnNames: readonly string[],
  primKey: IndexSpec,
): boolean {
  const { keyPath } = primKey;
  if (keyPath === undefined) {
    return false;
  }
  if (typeof keyPath === "string") {
    return columnNames.length === 1 && columnNames[0] === keyPath;
  }
  if (columnNames.length !== keyPath.length) {
    return false;
  }
  return keyPath.every((col, index) => {
    return col === columnNames[index];
  });
}

/** Returns the table collection narrowed by a `where` filter object. */
export function getFilteredDexieCollection<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    where: FiltersByColumn<M["DBRead"]>;
  }>,
): Collection<M["DBRead"]> {
  return buildFilteredDexieCollection(
    String(options.context.modelName),
    // `DB` is only constrained to `DexieDBType<M>`, so `DB[M["modelName"]]`
    // stays a table over the whole model union. Nothing proves the caller
    // narrowed `DB` to the single member whose row type is `M["DBRead"]`.
    options.context.table as Table<M["DBRead"], IndexableType>,
    options.where,
  );
}

/** Reads one row by key, throwing `message` when the row is absent. */
export async function getRequiredRow<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    key: DexieKey<M>;
    message: string;
  }>,
): Promise<M["DBRead"]> {
  const row = await options.context.table.get(options.key);
  if (!row) {
    throw new Error(options.message);
  }
  return row;
}

/** Reads a row's primary key, throwing `message` when it cannot be read. */
export function getPrimaryKey<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    row: M["DBInsert"];
    message: string;
  }>,
): DexieKey<M> {
  const key = _extractPrimaryKeyFromRow(
    options.row as Record<string, unknown>,
    options.context.table.schema.primKey,
  );
  if (key === undefined) {
    throw new Error(options.message);
  }
  return key as DexieKey<M>;
}

/** Adds a row and returns the stored row that IndexedDB produced. */
export async function addAndGet<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    data: M["DBInsert"];
  }>,
): Promise<M["DBRead"]> {
  const key = await options.context.table.add(options.data);
  return getRequiredRow({
    context: options.context,
    key: key as DexieKey<M>,
    message: "Could not find the model that should have just been inserted.",
  });
}

/** Puts a row and returns the stored row, naming `action` in any error. */
export async function putAndGet<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    data: M["DBInsert"];
    action: string;
  }>,
): Promise<M["DBRead"]> {
  await options.context.table.put(options.data);
  const key = getPrimaryKey({
    context: options.context,
    row: options.data,
    message: `Could not extract primary key after ${options.action}.`,
  });
  return getRequiredRow({
    context: options.context,
    key,
    message: `Could not find the model after ${options.action}.`,
  });
}

/** Returns the stored row conflicting with `data` on indexed columns. */
export async function findIndexedConflict<
  M extends DexieCrudModelSpec,
  DB extends DexieDBType<M>,
>(
  options: Readonly<{
    context: DexieCrudOperationContext<M, DB>;
    data: M["DBInsert"];
    columnNames: readonly string[];
  }>,
): Promise<M["DBRead"] | undefined> {
  const row = await findFirstConflictingRowByIndexedColumns(
    String(options.context.modelName),
    options.context.table as Table<Record<string, unknown>, IndexableType>,
    options.data as Record<string, unknown>,
    options.columnNames,
  );
  return row as M["DBRead"] | undefined;
}
