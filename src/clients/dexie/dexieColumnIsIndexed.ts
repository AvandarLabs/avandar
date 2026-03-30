import type { Table } from "dexie";

/**
 * Returns whether `columnKey` is part of the primary key or a secondary index.
 */
export function dexieColumnIsIndexed(
  dbTable: Table,
  columnKey: string,
): boolean {
  const { primKey, indexes } = dbTable.schema;
  const pkPath = primKey.keyPath;

  if (typeof pkPath === "string") {
    if (pkPath === columnKey) {
      return true;
    }
  } else if (Array.isArray(pkPath)) {
    if (pkPath.includes(columnKey)) {
      return true;
    }
  }

  return indexes.some((idx) => {
    const keyPath = idx.keyPath;

    if (keyPath === undefined) {
      return false;
    }

    if (typeof keyPath === "string") {
      return keyPath === columnKey;
    }

    return keyPath.includes(columnKey);
  });
}

/**
 * Throws if any `columnNames` entry is not indexed on `dbTable`.
 */
export function assertDexieColumnsAreIndexed(
  tableName: string,
  dbTable: Table,
  columnNames: readonly string[],
): void {
  for (const columnName of columnNames) {
    if (!dexieColumnIsIndexed(dbTable, columnName)) {
      throw new Error(
        `Dexie table "${tableName}": column "${columnName}" is not indexed. ` +
          `Only indexed columns are supported for this operation.`,
      );
    }
  }
}
