import { omitRecordPaths } from "@avandar/etl";
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
 * Package fields the pipeline maps in code: `name` becomes the listing's
 * `external_dataset_id` and `metadata_modified` its `date_of_last_update`.
 * `resources` is replaced by the relation's own resource.
 */
const PACKAGE_FIELDS_MAPPED_IN_CODE = [
  "name",
  "metadata_modified",
  "resources",
];

/**
 * Resource fields left out of a listing's additional source metadata. `id`,
 * `name`, `format`, `url`, and `url_type` become listing columns.
 * `download_url` and `hdx_rel_url` are copies of `url`, and `package_id` of
 * the package's `id`. `fs_check_info` is HDX's file check report, 19% of
 * HDX's raw JSON on the demo instance, whose headers the CKAN client
 * already reads into `fileHeaders`.
 */
const RESOURCE_FIELDS_LEFT_OUT = [
  "id",
  "name",
  "format",
  "url",
  "url_type",
  "download_url",
  "hdx_rel_url",
  "package_id",
  "fs_check_info",
];

function _isNonEmptyObject(value: unknown): value is object {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function _findRawResource(record: object, resourceId: string): unknown {
  const { resources } = record as { resources?: unknown };
  if (!Array.isArray(resources)) {
    return undefined;
  }
  return resources.find((rawResource: unknown) => {
    return (rawResource as { id?: unknown } | null)?.id === resourceId;
  });
}

/**
 * What a resource's listing keeps of its package and of itself that no
 * listing column holds, as `{ package, resource }`. `unmappedSourceRecord` is
 * the package already without the paths its field mappings consume, so this
 * only leaves out the fields mapped in code and the resource's copies. A
 * part with nothing left is left out, and so is the whole when both are.
 */
function _buildAdditionalSourceMetadata(
  unmappedSourceRecord: unknown,
  resourceId: string,
): unknown {
  if (
    typeof unmappedSourceRecord !== "object" ||
    unmappedSourceRecord === null
  ) {
    return undefined;
  }
  const packagePart = omitRecordPaths(
    unmappedSourceRecord,
    PACKAGE_FIELDS_MAPPED_IN_CODE,
  );
  const resourcePart = omitRecordPaths(
    _findRawResource(unmappedSourceRecord, resourceId),
    RESOURCE_FIELDS_LEFT_OUT,
  );
  const parts = {
    ...(_isNonEmptyObject(packagePart) ? { package: packagePart } : {}),
    ...(_isNonEmptyObject(resourcePart) ? { resource: resourcePart } : {}),
  };
  return Object.keys(parts).length > 0 ? parts : undefined;
}

function _toRelation(params: {
  drive: Readonly<HdxDrive>;
  ckanPackage: Readonly<CkanPackage>;
  unmappedSourceRecord: unknown;
  resource: Readonly<CkanResource>;
  sourceUpdatedAt: Date;
  readability: _ResourceReadability;
  mappedFields: CatalogMappedFields & Readonly<{ organization1Name: string }>;
}): ApiResourceRelation {
  const { drive, ckanPackage, resource, readability } = params;
  const additionalSourceMetadata = _buildAdditionalSourceMetadata(
    params.unmappedSourceRecord,
    resource.id,
  );
  return {
    ...params.mappedFields,
    ...(additionalSourceMetadata === undefined
      ? {}
      : { additionalSourceMetadata }),
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
 * resource of a package shares. Each relation's `additionalSourceMetadata`
 * keeps what the package and the relation's own resource say that no
 * listing column holds, as `{ package, resource }`: `unmappedSourceRecord`
 * without the fields mapped here and without the resource's copies of
 * them. The mapped fields are spread first, so a mapping can never overwrite
 * a field computed here.
 *
 * @param params.mappedFields - The package's mapped catalog metadata, which
 *   must name its level 1 organization.
 * @param params.unmappedSourceRecord - The raw package without the paths
 *   its field mappings consume and the config omits
 *   (`CatalogFieldMapper.omitMappedPaths`).
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
  unmappedSourceRecord: unknown;
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
        unmappedSourceRecord: params.unmappedSourceRecord,
      });
    },
  );
}
