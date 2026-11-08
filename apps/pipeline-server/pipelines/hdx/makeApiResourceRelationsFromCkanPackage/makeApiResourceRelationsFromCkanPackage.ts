import { promiseMapSequential } from "@avandar/utils";
import { getHdxDatasetTimestamp } from "@pipelines/hdx/getHdxDatasetTimestamp/getHdxDatasetTimestamp";
import { readHdxResourceColumns } from "@pipelines/hdx/readHdxResourceColumns/readHdxResourceColumns";
import { isReadableCkanResource } from "$/connectors/open-data/isReadableCkanResource/isReadableCkanResource";
import type {
  CkanPackage,
  CkanResource,
} from "$/connectors/open-data/CkanClient/CkanClient.types";
import type {
  ApiResourceRelation,
  CatalogMappedFields,
  EtlPipelineMetrics,
  RelationColumn,
} from "@avandar/etl";
import type { HdxDrive } from "@pipelines/hdx/hdxDrive";
import type { HdxScope } from "@pipelines/hdx/hdxScopes";
import type { HdxFileColumnReader } from "@pipelines/hdx/readHdxResourceColumns/readHdxResourceColumns";

/** A resource's columns, and whether a workspace can load it. */
type _ResourceReadability = Readonly<{
  isWorkspaceLoadable: boolean;
  columns: readonly RelationColumn[];
  columnTypesVerifiedAt: Date | undefined;
}>;

const UNLOADABLE: _ResourceReadability = {
  isWorkspaceLoadable: false,
  columns: [],
  columnTypesVerifiedAt: undefined,
};

/**
 * Whether a resource belongs to a scope: it has the scope's format, or, in
 * the scope with no format, none of the formats the other scopes take.
 * Formats compare case-insensitively.
 */
function _isInScope(
  resource: Readonly<CkanResource>,
  scope: HdxScope,
): boolean {
  const format = resource.format.toLowerCase();
  if (scope.resourceFormat !== undefined) {
    return format === scope.resourceFormat.toLowerCase();
  }
  return !(scope.excludedFormats ?? []).some((excludedFormat) => {
    return excludedFormat.toLowerCase() === format;
  });
}

/**
 * Reads a readable resource's columns. A resource Avandar cannot read, or
 * whose columns cannot be read, is unloadable, with no columns.
 */
async function _readResource(params: {
  resource: Readonly<CkanResource>;
  readFileColumns: HdxFileColumnReader;
  metrics: EtlPipelineMetrics;
}): Promise<_ResourceReadability> {
  if (!isReadableCkanResource(params.resource)) {
    return UNLOADABLE;
  }
  const resourceColumns = await readHdxResourceColumns(params);
  if (resourceColumns === undefined) {
    return UNLOADABLE;
  }
  return { isWorkspaceLoadable: true, ...resourceColumns };
}

/**
 * Package fields left out of `sourceMetadata`. `license_other` is the full
 * text of a custom license, repeated on every resource listing of a package:
 * on the demo instance it was 36% of HDX's raw JSON. The license's name
 * stays in the listing's `license`.
 */
const OMITTED_PACKAGE_FIELDS = ["license_other"];

/**
 * Resource fields left out of `sourceMetadata`. `fs_check_info` is HDX's
 * file check report, 19% of HDX's raw JSON on the demo instance. The CKAN
 * client already reads its headers into `fileHeaders`.
 */
const OMITTED_RESOURCE_FIELDS = ["fs_check_info"];

function _omitFields(record: object, fields: readonly string[]): object {
  return Object.fromEntries(
    Object.entries(record).filter(([field]) => {
      return !fields.includes(field);
    }),
  );
}

/**
 * The raw CKAN package as a resource's listing keeps it: with only that
 * resource left in its `resources`, and without the bulky fields above. A
 * package lists every resource, so storing it whole on each resource's
 * listing grows a package's write with the square of its resource count: a
 * WHO country package's 73 listings carried 42 MB. A record whose resource
 * list cannot be read is kept as it is.
 */
function _buildSourceMetadata(
  sourceRecord: unknown,
  resourceId: string,
): unknown {
  if (typeof sourceRecord !== "object" || sourceRecord === null) {
    return sourceRecord;
  }
  const { resources } = sourceRecord as { resources?: unknown };
  if (!Array.isArray(resources)) {
    return sourceRecord;
  }
  return {
    ..._omitFields(sourceRecord, OMITTED_PACKAGE_FIELDS),
    resources: resources.flatMap((rawResource: unknown) => {
      const isOwnResource =
        (rawResource as { id?: unknown } | null)?.id === resourceId;
      return isOwnResource
        ? [_omitFields(rawResource as object, OMITTED_RESOURCE_FIELDS)]
        : [];
    }),
  };
}

function _toRelation(params: {
  drive: Readonly<HdxDrive>;
  ckanPackage: Readonly<CkanPackage>;
  resource: Readonly<CkanResource>;
  sourceUpdatedAt: Date;
  readability: _ResourceReadability;
  mappedFields: CatalogMappedFields & Readonly<{ organization1Name: string }>;
}): ApiResourceRelation {
  const { drive, ckanPackage, resource, readability } = params;
  return {
    ...params.mappedFields,
    sourceMetadata: _buildSourceMetadata(ckanPackage.sourceRecord, resource.id),
    kind: "api_resource",
    externalDatasetId: ckanPackage.name,
    apiResourceId: resource.id,
    apiResourceFormat:
      resource.format === "" ? undefined : resource.format.toUpperCase(),
    displayName: resource.name,
    sourceUpdatedAt: params.sourceUpdatedAt,
    ...(resource.url_type === "" ? {} : { sourceAssetType: resource.url_type }),
    sourceUrl: `${drive.baseUrl}/dataset/${ckanPackage.name}/resource/${resource.id}`,
    ...(resource.url === "" ? {} : { sourceDownloadUrl: resource.url }),
    ...(readability.isWorkspaceLoadable ? {} : { isWorkspaceLoadable: false }),
    columns: readability.columns,
    ...(readability.columnTypesVerifiedAt === undefined
      ? {}
      : { columnTypesVerifiedAt: readability.columnTypesVerifiedAt }),
    ...(resource.size === undefined ? {} : { sourceSizeBytes: resource.size }),
  };
}

/**
 * Builds one relation per CKAN resource in the scope, each dated by the
 * same `metadata_modified` the crawl orders datasets by and linked to its
 * page on HDX. A resource is workspace-loadable only when it passes the
 * readability rule the acquisition path enforces at query time and its
 * columns can be found. Otherwise it is listed unloadable, with no columns,
 * so it still shows up in the catalog. Each relation carries the columns
 * `readHdxResourceColumns` finds, verified only when they were read from the
 * file, and reports the resource's `size` as `sourceSizeBytes` when CKAN
 * records one.
 *
 * The catalog metadata (organizations, description, domains, tags, and the
 * rest) comes from the pipeline config's field mapping, which every
 * resource of a package shares. Each relation keeps the raw CKAN package as
 * `sourceMetadata`, with its `resources` narrowed to the relation's own raw
 * resource and its bulkiest fields left out (`license_other`,
 * `fs_check_info`). The mapped fields are spread first, so a mapping can never
 * overwrite a field computed here.
 *
 * @param params.mappedFields - The package's mapped catalog metadata, which
 *   must name its level 1 organization.
 * @param params.scope - The scope being crawled. Only its resources become
 *   relations.
 * @param params.readFileColumns - Reads a resource's columns from its file
 *   when HDX recorded no usable headers.
 * @param params.metrics - Receives the footer reads that finding columns
 *   takes.
 * @throws When a dataset with a resource in the scope has no
 * `metadata_modified`.
 */
export async function makeApiResourceRelationsFromCkanPackage(params: {
  drive: Readonly<HdxDrive>;
  ckanPackage: Readonly<CkanPackage>;
  mappedFields: CatalogMappedFields & Readonly<{ organization1Name: string }>;
  scope: HdxScope;
  readFileColumns: HdxFileColumnReader;
  metrics: EtlPipelineMetrics;
}): Promise<ApiResourceRelation[]> {
  const { drive, ckanPackage } = params;
  const scopedResources = ckanPackage.resources.filter((resource) => {
    return _isInScope(resource, params.scope);
  });
  if (scopedResources.length === 0) {
    return [];
  }
  const sourceUpdatedAt = getHdxDatasetTimestamp(ckanPackage);
  return await promiseMapSequential(
    scopedResources,
    async (resource: CkanResource) => {
      const readability = await _readResource({
        resource,
        readFileColumns: params.readFileColumns,
        metrics: params.metrics,
      });
      return _toRelation({
        drive,
        ckanPackage,
        resource,
        sourceUpdatedAt,
        readability,
        mappedFields: params.mappedFields,
      });
    },
  );
}
