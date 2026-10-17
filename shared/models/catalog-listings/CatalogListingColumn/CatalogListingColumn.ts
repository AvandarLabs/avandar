/* eslint-disable @typescript-eslint/no-namespace */
import type {
  CatalogListingColumnId,
  CatalogListingColumnModel,
} from "$/models/catalog-listings/CatalogListingColumn/CatalogListingColumn.types.ts";

export { CatalogListingColumnParsers } from "$/models/catalog-listings/CatalogListingColumn/CatalogListingColumnParsers.ts";

export namespace CatalogListingColumn {
  export type T<K extends keyof CatalogListingColumnModel = "Read"> =
    CatalogListingColumnModel[K];
  export type Id = CatalogListingColumnId;
}
