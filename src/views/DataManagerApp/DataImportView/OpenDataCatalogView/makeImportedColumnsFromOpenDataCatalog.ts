import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import type { CatalogDatasetColumnRead } from "$/models/catalog-entries/CatalogDatasetColumn/CatalogDatasetColumn.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Json } from "$/types/database.types";

/** Reads `metadata.table.column_names` from catalog pipeline metadata. */
function _getColumnNamesFromOpenDataMetadata(
  metadata: Json | undefined,
): string[] | undefined {
  if (metadata === undefined || metadata === null) {
    return undefined;
  }

  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const record = metadata as Record<string, unknown>;
  const table = record.table;

  if (!table || typeof table !== "object" || Array.isArray(table)) {
    return undefined;
  }

  const columnNames = (table as Record<string, unknown>).column_names;

  if (!Array.isArray(columnNames)) {
    return undefined;
  }

  const names = columnNames.filter((value): value is string => {
    return typeof value === "string";
  });

  return names.length > 0 ? names : undefined;
}

/**
 * Makes open-data import columns from catalog column names alone.
 *
 * Uses `VARCHAR` / `varchar` so Parquet loads without forced casts when types
 * match user expectations in Qetl.
 */
function _makeImportedColumnsFromColumnNames(
  columnNames: readonly string[],
): DatasetColumn.Imported[] {
  return columnNames.map((originalName, columnIdx) => {
    return {
      originalName,
      name: originalName,
      originalDataType: "VARCHAR",
      detectedDataType: "VARCHAR",
      dataType: "varchar",
      isDataTypeUserSet: false,
      columnIdx,
    };
  });
}

/** Stable order for catalog column rows: `display_order` then name. */
function _sortCatalogDatasetColumns(
  rows: readonly CatalogDatasetColumnRead[],
): CatalogDatasetColumnRead[] {
  return [...rows].sort((a, b) => {
    const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.columnName.localeCompare(b.columnName);
  });
}

/**
 * Makes open-data import columns from `catalog_entries__dataset_column` rows.
 */
function _makeImportedColumnsFromCatalogRows(
  rows: readonly CatalogDatasetColumnRead[],
): DatasetColumn.Imported[] {
  const sorted = _sortCatalogDatasetColumns(rows);
  return sorted.map((column, columnIdx) => {
    return {
      originalName: column.columnName,
      name: column.columnName,
      originalDataType: column.originalDataType,
      detectedDataType: column.castDataType,
      dataType: DuckDbDataTypeUtils.toAvaDataType(column.castDataType),
      isDataTypeUserSet: false,
      columnIdx,
    };
  });
}

/**
 * Makes the columns an open-data import will persist, preferring normalized
 * catalog column rows and falling back to legacy JSON metadata.
 *
 * These reach the insert RPC through
 * `makeDatasetColumnInputsFromImportedColumns` like every other source's
 * columns do, but open data never offers the user a column editor: the
 * catalog, not this workspace, owns what the columns are called and how they
 * are typed.
 */
export function makeImportedColumnsFromOpenDataCatalog(options: {
  catalogColumns: readonly CatalogDatasetColumnRead[] | undefined;
  metadata: Json | undefined;
}): DatasetColumn.Imported[] | undefined {
  const { catalogColumns, metadata } = options;
  if (catalogColumns !== undefined && catalogColumns.length > 0) {
    return _makeImportedColumnsFromCatalogRows(catalogColumns);
  }
  const columnNames = _getColumnNamesFromOpenDataMetadata(metadata);
  if (!columnNames) {
    return undefined;
  }
  return _makeImportedColumnsFromColumnNames(columnNames);
}
