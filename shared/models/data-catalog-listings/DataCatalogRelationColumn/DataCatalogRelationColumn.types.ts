import type { DataCatalogListingId } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

export type DataCatalogRelationColumnId = UUID<"DataCatalogRelationColumn">;

export type DataCatalogRelationColumnRead = {
  /** Primary key. */
  id: DataCatalogRelationColumnId;

  /** Parent open-data catalog listing. */
  catalogListingId: DataCatalogListingId;

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
 * CRUD type definitions for the DataCatalogRelationColumn model.
 */
export type DataCatalogRelationColumnModel = SupabaseCrudModelSpec<
  {
    tableName: "data_catalog_listings__relation_columns";
    modelName: "DataCatalogRelationColumn";
    modelPrimaryKeyType: DataCatalogRelationColumnId;
    modelTypes: {
      Read: DataCatalogRelationColumnRead;
      Insert: SetOptional<
        DataCatalogRelationColumnRead,
        "id" | "createdAt" | "updatedAt"
      >;
      Update: Partial<DataCatalogRelationColumnRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
