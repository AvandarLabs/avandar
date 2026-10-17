/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  OpenDataAccess,
  OpenDataAccessKind,
  OpenDataApiService,
  OpenDataCatalogListingId,
  OpenDataCatalogListingModel,
} from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListing.types.ts";

export { OpenDataCatalogListingParsers } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListingParsers.ts";
export { OpenDataCatalogListingModule as OpenDataCatalogListing } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListingModule.ts";

export namespace OpenDataCatalogListing {
  export type T<K extends keyof OpenDataCatalogListingModel = "Read"> =
    OpenDataCatalogListingModel[K];
  export type Id = OpenDataCatalogListingId;

  /** The access shape `toAccess` produces, with its undefined checks done. */
  export type Access = OpenDataAccess;

  /** Which of the two access shapes an entry uses. */
  export type AccessKind = OpenDataAccessKind;

  /** The API protocol an `api_resource` entry speaks. */
  export type ApiService = OpenDataApiService;
}
