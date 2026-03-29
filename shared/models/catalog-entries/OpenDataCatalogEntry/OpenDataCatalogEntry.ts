/* eslint-disable @typescript-eslint/no-namespace */
import type {
  OpenDataCatalogEntryId,
  OpenDataCatalogEntryModel,
} from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts";

export namespace OpenDataCatalogEntry {
  export type T<K extends keyof OpenDataCatalogEntryModel = "Read"> =
    OpenDataCatalogEntryModel[K];
  export type Id = OpenDataCatalogEntryId;
}
