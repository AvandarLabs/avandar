import { isReadableCkanResource } from "$/connectors/open-data/isReadableCkanResource/isReadableCkanResource";
import { parseCkanTimestamp } from "$/connectors/open-data/parseCkanTimestamp/parseCkanTimestamp";
import type { ApiResourceRelation } from "@avandar/etl";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { HdxDrive } from "@pipelines/hdx/hdxDrive";

/**
 * Builds one relation per CKAN resource worth reading, using the same
 * readability rule the acquisition path enforces at query time. A dataset
 * with no readable resource yields none.
 */
export function makeApiResourceRelationsFromCkanPackage(params: {
  drive: Readonly<HdxDrive>;
  ckanPackage: Readonly<CkanPackage>;
}): ApiResourceRelation[] {
  const { drive, ckanPackage } = params;
  const sourceUpdatedAt =
    ckanPackage.metadata_modified === undefined ?
      undefined
    : parseCkanTimestamp(ckanPackage.metadata_modified);
  return ckanPackage.resources
    .filter(isReadableCkanResource)
    .map((resource) => {
      return {
        kind: "api_resource",
        externalDatasetId: ckanPackage.name,
        apiResourceId: resource.id,
        apiResourceFormat: resource.format.toUpperCase(),
        displayName: resource.name,
        externalOrganizationName: drive.organizationName,
        sourceUpdatedAt,
      };
    });
}
