import type {
  SudanCholeraCatalogEntry, // prettier-ignore
} from "@pipelines/hdx__sudan-cholera-2025/sudanCholeraCatalogEntries";

import {
  HDX_API_BASE_URL, // prettier-ignore
} from "@pipelines/hdx__sudan-cholera-2025/sudanCholeraCatalogEntries";

/** One `catalog_entries__open_data` row for an API-backed resource. */
export type OpenDataCatalogRow = {
  access_kind: "api_resource";
  api_service: "ckan";
  api_base_url: string;
  api_resource_id: string;
  api_resource_format: string;
  external_dataset_id: string;
  display_name: string;
  description: string;
  notes: string;
  external_organization_name: string;
  external_service_name: string;
  source_url: string;
  canonical_urls: string[];
  license: string;
  update_frequency: string;
  metadata: { table: { column_names: string[] } };
};

/**
 * Builds the catalog row for one HDX resource.
 *
 * Every pipeline column is left unset rather than nulled explicitly: the table
 * requires an `api_resource` row to carry none of them, and omitting them lets
 * the column defaults say so instead of this builder restating it.
 *
 * `metadata.table.column_names` duplicates the normalized column rows on
 * purpose. The import form reads the normalized rows when they exist and falls
 * back to this list, so writing both means an entry stays importable even if
 * its column rows are lost.
 */
export function buildOpenDataCatalogRow(
  entry: Readonly<SudanCholeraCatalogEntry>,
): OpenDataCatalogRow {
  return {
    access_kind: "api_resource",
    api_service: "ckan",
    api_base_url: HDX_API_BASE_URL,
    api_resource_id: entry.apiResourceId,
    api_resource_format: entry.apiResourceFormat,
    external_dataset_id: entry.externalDatasetId,
    display_name: entry.displayName,
    description: entry.description,
    notes: entry.notes,
    external_organization_name: entry.externalOrganizationName,
    external_service_name: entry.externalServiceName,
    source_url: entry.sourceUrl,
    canonical_urls: [...entry.canonicalUrls],
    license: entry.license,
    update_frequency: entry.updateFrequency,
    metadata: {
      table: {
        column_names: entry.columns.map((column) => {
          return column.columnName;
        }),
      },
    },
  };
}
