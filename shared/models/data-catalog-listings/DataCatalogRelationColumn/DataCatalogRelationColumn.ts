/* eslint-disable @typescript-eslint/no-namespace */
import type {
  DataCatalogRelationColumnId,
  DataCatalogRelationColumnModel,
} from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumn.types.ts";

export { DataCatalogRelationColumnParsers } from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumnParsers.ts";

export namespace DataCatalogRelationColumn {
  export type T<K extends keyof DataCatalogRelationColumnModel = "Read"> =
    DataCatalogRelationColumnModel[K];
  export type Id = DataCatalogRelationColumnId;
}
