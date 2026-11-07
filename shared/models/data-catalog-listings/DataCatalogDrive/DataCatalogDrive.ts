/* eslint-disable @typescript-eslint/no-namespace */
import type {
  DataCatalogDriveId,
  DataCatalogDriveModel,
} from "$/models/data-catalog-listings/DataCatalogDrive/DataCatalogDrive.types.ts";

export { DataCatalogDriveParsers } from "$/models/data-catalog-listings/DataCatalogDrive/DataCatalogDriveParsers.ts";

export namespace DataCatalogDrive {
  export type T<K extends keyof DataCatalogDriveModel = "Read"> =
    DataCatalogDriveModel[K];
  export type Id = DataCatalogDriveId;
}
