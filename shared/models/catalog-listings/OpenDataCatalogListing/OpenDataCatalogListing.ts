/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  OpenDataAccess,
  OpenDataAccessKind,
  OpenDataApiService,
  OpenDataCatalogEntryId,
  OpenDataCatalogEntryModel,
} from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts";

export { OpenDataCatalogEntryParsers } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryParsers.ts";
export { OpenDataCatalogEntryModule as OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryModule.ts";

export namespace OpenDataCatalogEntry {
  export type T<K extends keyof OpenDataCatalogEntryModel = "Read"> =
    OpenDataCatalogEntryModel[K];
  export type Id = OpenDataCatalogEntryId;

  /** The access shape `toAccess` produces, with its undefined checks done. */
  export type Access = OpenDataAccess;

  /** Which of the two access shapes an entry uses. */
  export type AccessKind = OpenDataAccessKind;

  /** The API protocol an `api_resource` entry speaks. */
  export type ApiService = OpenDataApiService;
}
