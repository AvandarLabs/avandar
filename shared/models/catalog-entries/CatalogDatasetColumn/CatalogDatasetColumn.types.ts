import type { UUID } from "@utils/types/common.types.ts";
import type { OpenDataCatalogEntryId } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts";
import type { DuckDBDataType } from "$/models/datasets/DatasetColumn/DuckDBDataTypes.ts";
import type { SupabaseCRUDModelSpec } from "$/models/SupabaseCRUDModelSpec.ts";
import type { SetOptional } from "type-fest";

export type CatalogDatasetColumnId = UUID<"CatalogDatasetColumn">;

export type CatalogDatasetColumnRead = {
  /** Primary key. */
  id: CatalogDatasetColumnId;

  /** Parent open-data catalog entry. */
  catalogEntryId: OpenDataCatalogEntryId;

  /** Column name in the source Parquet / dataset. */
  columnName: string;

  /** Display order (0-based index in the pipeline). */
  displayOrder: number | undefined;

  createdAt: string;

  updatedAt: string;

  /**
   * Raw data type string from DuckDB `DESCRIBE` (or another source) at
   * catalog time.
   */
  originalDataType: string;

  /** DuckDB type used when casting / interpreting this column in Avandar. */
  castDataType: DuckDBDataType;
};

/**
 * CRUD type definitions for the CatalogDatasetColumn model.
 */
export type CatalogDatasetColumnModel = SupabaseCRUDModelSpec<
  {
    tableName: "catalog_entries__dataset_column";
    modelName: "CatalogDatasetColumn";
    modelPrimaryKeyType: CatalogDatasetColumnId;
    modelTypes: {
      Read: CatalogDatasetColumnRead;
      Insert: SetOptional<
        CatalogDatasetColumnRead,
        "id" | "createdAt" | "updatedAt"
      >;
      Update: Partial<CatalogDatasetColumnRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type CatalogDatasetColumn<
  K extends keyof CatalogDatasetColumnModel = "Read",
> = CatalogDatasetColumnModel[K];
