/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  OpenDataAccess,
  OpenDataAccessKind,
  OpenDataApiService,
  DataCatalogListingId,
  DataCatalogListingModel,
} from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";

export { DataCatalogListingParsers } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers.ts";
export { DataCatalogListingModule as DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingModule.ts";

export namespace DataCatalogListing {
  export type T<K extends keyof DataCatalogListingModel = "Read"> =
    DataCatalogListingModel[K];
  export type Id = DataCatalogListingId;

  /** The access shape `toAccess` produces, with its undefined checks done. */
  export type Access = OpenDataAccess;

  /** Which of the two access shapes an entry uses. */
  export type AccessKind = OpenDataAccessKind;

  /** The API protocol an `api_resource` entry speaks. */
  export type ApiService = OpenDataApiService;
}
