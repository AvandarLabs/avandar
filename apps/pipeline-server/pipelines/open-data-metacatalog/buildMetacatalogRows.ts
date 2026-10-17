import { isReadableCkanResource } from "$/connectors/open-data/getCkanResourceFromPackage";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { SocrataDiscoveryResult } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ConfiguredDrive } from "@pipelines/open-data-metacatalog/configuredDrives";

/**
 * One `catalog_entries__open_data` row, upsert-ready. Deliberately never
 * carries `cached_object_path`/`cached_source_version`/`cached_at`: the
 * upsert in `upsertMetacatalogRows.ts` relies on their absence to leave an
 * existing row's cache untouched on a re-run.
 */
export type MetacatalogRow = {
  access_kind: "api_resource";
  api_service: "ckan" | "socrata";
  api_base_url: string;
  external_dataset_id: string;
  api_resource_id: string;
  api_resource_format: string;
  display_name: string;
  external_organization_name: string;
};

/**
 * Builds one row per CKAN resource worth reading, using the exact same
 * readability rule the acquisition path enforces at query time. A dataset
 * with no readable resource yields no rows at all - it is still visible
 * via `package_list`, just not catalog-worthy.
 */
export function buildCkanMetacatalogRows(params: {
  drive: Readonly<ConfiguredDrive>;
  ckanPackage: Readonly<CkanPackage>;
}): MetacatalogRow[] {
  const { drive, ckanPackage } = params;
  return ckanPackage.resources
    .filter(isReadableCkanResource)
    .map((resource) => {
      return {
        access_kind: "api_resource",
        api_service: "ckan",
        api_base_url: drive.baseUrl,
        external_dataset_id: ckanPackage.name,
        api_resource_id: resource.id,
        api_resource_format: resource.format.toUpperCase(),
        display_name: resource.name,
        external_organization_name: drive.organizationName,
      } satisfies MetacatalogRow;
    });
}

/**
 * Builds the one row a discovered Socrata dataset becomes. Always
 * `"CSV"`: `SocrataClient.getRows` always fetches the `.csv` export
 * regardless of what else the view offers, so that is what this row will
 * actually be read as, not a value read from any Socrata metadata field.
 */
export function buildSocrataMetacatalogRow(params: {
  drive: Readonly<ConfiguredDrive>;
  result: Readonly<SocrataDiscoveryResult>;
}): MetacatalogRow {
  const { drive, result } = params;
  return {
    access_kind: "api_resource",
    api_service: "socrata",
    api_base_url: drive.baseUrl,
    external_dataset_id: result.datasetId,
    api_resource_id: result.datasetId,
    api_resource_format: "CSV",
    display_name: result.name,
    external_organization_name: drive.organizationName,
  };
}
