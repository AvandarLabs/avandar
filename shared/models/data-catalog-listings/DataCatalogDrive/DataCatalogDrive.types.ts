import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

export type DataCatalogDriveId = UUID<"DataCatalogDrive">;

/**
 * One drive a catalog pipeline crawls, such as a city's open data portal,
 * and what each organization level of its listings is called there.
 */
export type DataCatalogDriveRead = {
  /** Primary key. */
  id: DataCatalogDriveId;

  createdAt: string;

  updatedAt: string;

  /** The pipeline that crawls this drive, such as `socrata`. */
  pipelineName: string;

  /** The drive's base URL, such as `https://data.cityofnewyork.us`. */
  driveKey: string;

  /**
   * What a listing's `organization1Name` is called on this drive, such as
   * `City`. Undefined when the drive does not label the level.
   */
  organization1Label: string | undefined;

  /** What `organization2Name` is called, such as `Agency`. */
  organization2Label: string | undefined;

  /** What `organization3Name` is called. */
  organization3Label: string | undefined;

  /** What `organization4Name` is called. */
  organization4Label: string | undefined;
};

/**
 * CRUD type definitions for the DataCatalogDrive model. The app only reads
 * drives. The pipelines write them with the service role.
 */
export type DataCatalogDriveModel = SupabaseCrudModelSpec<
  {
    tableName: "data_catalog_drives";
    modelName: "DataCatalogDrive";
    modelPrimaryKeyType: DataCatalogDriveId;
    modelTypes: {
      Read: DataCatalogDriveRead;
      Insert: SetOptional<
        DataCatalogDriveRead,
        "id" | "createdAt" | "updatedAt"
      >;
      Update: Partial<DataCatalogDriveRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
