import { DuckDBDataTypeUtils } from "@/clients/DuckDBClient/DuckDBDataType";
import type { ExcludeNullsIn } from "@utils/objects/excludeNullsIn/excludeNullsIn";
import type { CatalogDatasetColumnRead } from "$/models/catalog-entries/CatalogDatasetColumn/CatalogDatasetColumn.types";
import type { CompositeTypes, Json } from "$/types/database.types";
import type { SetOptional } from "type-fest";

type DatasetColumnInput = SetOptional<
  ExcludeNullsIn<CompositeTypes<"dataset_column_input">>,
  "description"
>;

/**
 * Reads `metadata.table.column_names` from catalog pipeline metadata.
 *
 * @param metadata - Raw JSON from `catalog_entries__open_data.metadata`.
 * @returns Column names when present, otherwise `undefined`.
 */
export function getColumnNamesFromOpenDataMetadata(
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
 * Builds RPC column inputs for open-data datasets using catalog column names.
 * Uses `VARCHAR` / `varchar` so Parquet loads without forced casts when types
 * match user expectations in QETL.
 *
 * @param columnNames - Original column names from the catalog metadata.
 * @returns Rows for `rpc_datasets__add_open_data_dataset.p_columns`.
 */
export function buildOpenDataDatasetColumnInputs(
  columnNames: readonly string[],
): DatasetColumnInput[] {
  return columnNames.map((originalName, columnIdx) => {
    return {
      original_name: originalName,
      name: originalName,
      description: undefined,
      original_data_type: "VARCHAR",
      detected_data_type: "VARCHAR",
      data_type: "varchar",
      column_idx: columnIdx,
    };
  });
}

/**
 * Stable order for catalog column rows: `display_order` then name.
 */
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
 * Builds RPC column inputs from `catalog_entries__dataset_column` rows.
 *
 * @param rows - Column rows for one open-data catalog entry.
 */
export function buildOpenDataDatasetColumnInputsFromCatalogRows(
  rows: readonly CatalogDatasetColumnRead[],
): DatasetColumnInput[] {
  const sorted = _sortCatalogDatasetColumns(rows);
  return sorted.map((col, columnIdx) => {
    return {
      original_name: col.columnName,
      name: col.columnName,
      description: undefined,
      original_data_type: col.originalDataType,
      detected_data_type: col.castDataType,
      data_type: DuckDBDataTypeUtils.toAvaDataType(col.castDataType),
      column_idx: columnIdx,
    };
  });
}

/**
 * Prefers normalized catalog column rows; falls back to legacy JSON metadata.
 *
 * @param options.catalogColumns - Rows from `catalog_entries__dataset_column`.
 * @param options.metadata - Legacy `catalog_entries__open_data.metadata` JSON.
 */
export function resolveOpenDataDatasetColumnInputs(options: {
  catalogColumns: readonly CatalogDatasetColumnRead[] | undefined;
  metadata: Json | undefined;
}): DatasetColumnInput[] | undefined {
  const { catalogColumns, metadata } = options;
  if (catalogColumns !== undefined && catalogColumns.length > 0) {
    return buildOpenDataDatasetColumnInputsFromCatalogRows(catalogColumns);
  }
  const columnNames = getColumnNamesFromOpenDataMetadata(metadata);
  if (!columnNames) {
    return undefined;
  }
  return buildOpenDataDatasetColumnInputs(columnNames);
}
