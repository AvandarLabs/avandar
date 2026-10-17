import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/**
 * One `data_catalog_listings` row, upsert-ready. Deliberately never
 * carries `cached_object_path`/`cached_source_version`/`cached_at`: the
 * upsert in `upsertDataCatalogListingRows.ts` relies on their absence to
 * leave an existing row's cache untouched on a re-run.
 */
export type DataCatalogListingRow = {
  access_kind: "api_resource";
  api_service: DataCatalogListing.ApiService;
  api_base_url: string;
  external_dataset_id: string;
  api_resource_id: string;
  api_resource_format: string;
  display_name: string;
  external_organization_name: string;
};
