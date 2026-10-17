import type { OpenDataCatalogListing } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListing";

/**
 * One `catalog_listings__open_data` row, upsert-ready. Deliberately never
 * carries `cached_object_path`/`cached_source_version`/`cached_at`: the
 * upsert in `upsertCatalogListingRows.ts` relies on their absence to leave an
 * existing row's cache untouched on a re-run.
 */
export type CatalogListingRow = {
  access_kind: "api_resource";
  api_service: OpenDataCatalogListing.ApiService;
  api_base_url: string;
  external_dataset_id: string;
  api_resource_id: string;
  api_resource_format: string;
  display_name: string;
  external_organization_name: string;
};
