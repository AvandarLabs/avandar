import { promiseMapSequential } from "@avandar/utils";
import { getHdxDatasetTimestamp } from "@pipelines/hdx/getHdxDatasetTimestamp/getHdxDatasetTimestamp";
import { readHdxResourceColumns } from "@pipelines/hdx/readHdxResourceColumns/readHdxResourceColumns";
import { isReadableCkanResource } from "$/connectors/open-data/isReadableCkanResource/isReadableCkanResource";
import type {
  CkanPackage,
  CkanResource,
} from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { ApiResourceRelation } from "@avandar/etl";
import type { HdxDrive } from "@pipelines/hdx/hdxDrive";
import type { HdxFileColumnReader } from "@pipelines/hdx/readHdxResourceColumns/readHdxResourceColumns";

/**
 * Builds one relation per CKAN resource worth reading, using the same
 * readability rule the acquisition path enforces at query time. A dataset
 * with no readable resource yields none. Each relation is dated by the same
 * `metadata_modified` the crawl orders datasets by, and carries the columns
 * `readHdxResourceColumns` finds. A resource with no columns is left out and
 * logged with `console.warn`, since a listing is never stored without its
 * columns.
 *
 * @param params.resourceFormat - The scope's format. Only readable resources
 *   in it, compared case-insensitively, become relations.
 * @param params.readFileColumns - Reads a resource's columns from its file
 *   when HDX recorded no usable headers.
 * @throws When a dataset with a readable resource has no
 * `metadata_modified`.
 */
export async function makeApiResourceRelationsFromCkanPackage(params: {
  drive: Readonly<HdxDrive>;
  ckanPackage: Readonly<CkanPackage>;
  resourceFormat: string;
  readFileColumns: HdxFileColumnReader;
}): Promise<ApiResourceRelation[]> {
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
  const relations = await promiseMapSequential(
    readableResources,
    async (resource: CkanResource) => {
      const columns = await readHdxResourceColumns({
        resource,
        readFileColumns: params.readFileColumns,
      });
      if (columns === undefined) {
        console.warn(
          `[hdx] drive ${drive.baseUrl}: skipped resource ${resource.id} of dataset ${ckanPackage.name}: no columns could be read`,
        );
        return undefined;
      }
      return {
        kind: "api_resource" as const,
        externalDatasetId: ckanPackage.name,
        apiResourceId: resource.id,
        apiResourceFormat: resource.format.toUpperCase(),
        displayName: resource.name,
        externalOrganizationName: drive.organizationName,
        sourceUpdatedAt,
        columns,
      };
    },
  );
  return relations.filter((relation) => {
    return relation !== undefined;
  });
}
