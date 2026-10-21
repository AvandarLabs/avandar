import { getHdxDatasetTimestamp } from "@pipelines/hdx/getHdxDatasetTimestamp/getHdxDatasetTimestamp";
import { isReadableCkanResource } from "$/connectors/open-data/isReadableCkanResource/isReadableCkanResource";
import type { ApiResourceRelation } from "@avandar/etl";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { HdxDrive } from "@pipelines/hdx/hdxDrive";

/**
 * Builds one relation per CKAN resource worth reading, using the same
 * readability rule the acquisition path enforces at query time. A dataset
 * with no readable resource yields none. Each relation is dated by the same
 * `metadata_modified` the crawl orders datasets by.
 *
 * @param params.resourceFormat - The scope's format. Only readable resources
 *   in it, compared case-insensitively, become relations.
 * @throws When a dataset with a readable resource has no
 * `metadata_modified`.
 */
export function makeApiResourceRelationsFromCkanPackage(params: {
  drive: Readonly<HdxDrive>;
  ckanPackage: Readonly<CkanPackage>;
  resourceFormat: string;
}): ApiResourceRelation[] {
  const { drive, ckanPackage } = params;
  const wantedFormat = params.resourceFormat.toLowerCase();
  const readableResources = ckanPackage.resources.filter((resource) => {
    return (
      isReadableCkanResource(resource) &&
      resource.format.toLowerCase() === wantedFormat
    );
  });
  if (readableResources.length === 0) {
    return [];
  }
  const sourceUpdatedAt = getHdxDatasetTimestamp(ckanPackage);
  return readableResources.map((resource) => {
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
