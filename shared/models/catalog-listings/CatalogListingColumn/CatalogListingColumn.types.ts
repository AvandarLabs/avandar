import type { OpenDataCatalogListingId } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListing.types.ts";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

export type CatalogListingColumnId = UUID<"CatalogListingColumn">;

export type CatalogListingColumnRead = {
  /** Primary key. */
  id: CatalogListingColumnId;

  /** Parent open-data catalog listing. */
  catalogListingId: OpenDataCatalogListingId;

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
  castDataType: DuckDbDataType;
};

/**
 * CRUD type definitions for the CatalogListingColumn model.
 */
export type CatalogListingColumnModel = SupabaseCrudModelSpec<
  {
    tableName: "catalog_listings__dataset_column";
    modelName: "CatalogListingColumn";
    modelPrimaryKeyType: CatalogListingColumnId;
    modelTypes: {
      Read: CatalogListingColumnRead;
      Insert: SetOptional<
        CatalogListingColumnRead,
        "id" | "createdAt" | "updatedAt"
      >;
      Update: Partial<CatalogListingColumnRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
