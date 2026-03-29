/* eslint-disable @typescript-eslint/no-namespace */
import type {
  CatalogDatasetColumnId,
  CatalogDatasetColumnModel,
} from "$/models/catalog-entries/CatalogDatasetColumn/CatalogDatasetColumn.types.ts";

export namespace CatalogDatasetColumn {
  export type T<K extends keyof CatalogDatasetColumnModel = "Read"> =
    CatalogDatasetColumnModel[K];
  export type Id = CatalogDatasetColumnId;
}
