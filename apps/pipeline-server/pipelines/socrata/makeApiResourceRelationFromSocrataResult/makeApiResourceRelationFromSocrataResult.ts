import type { ApiResourceRelation } from "@avandar/etl";
import type { SocrataDiscoveryResult } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";

/**
 * Builds the one relation a discovered Socrata dataset becomes. Always
 * `"CSV"`: `SocrataClient.getRows` always fetches the `.csv` export, so that
 * is what the listing is read as, not a value from Socrata's metadata.
 */
export function makeApiResourceRelationFromSocrataResult(params: {
  drive: Readonly<ConfiguredDrive>;
  result: Readonly<SocrataDiscoveryResult>;
}): ApiResourceRelation {
  const { drive, result } = params;
  return {
    kind: "api_resource",
    externalDatasetId: result.datasetId,
    apiResourceId: result.datasetId,
    apiResourceFormat: "CSV",
    displayName: result.name,
    externalOrganizationName: drive.organizationName,
    sourceUpdatedAt: new Date(result.updatedAt),
  };
}
