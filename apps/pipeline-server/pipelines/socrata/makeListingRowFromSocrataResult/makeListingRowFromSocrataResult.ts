import type { SocrataDiscoveryResult } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";
import type { DataCatalogListingRow } from "@pipelines/shared/DataCatalogListingRow.types";

/**
 * Builds the one row a discovered Socrata dataset becomes. Always
 * `"CSV"`: `SocrataClient.getRows` always fetches the `.csv` export
 * regardless of what else the view offers, so that is what this row will
 * actually be read as, not a value read from any Socrata metadata field.
 */
export function makeListingRowFromSocrataResult(params: {
  drive: Readonly<ConfiguredDrive>;
  result: Readonly<SocrataDiscoveryResult>;
}): DataCatalogListingRow {
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
