import { normalizeEtlFormat } from "@etl/EtlConfig/getWorkspaceLoadabilityRules/getWorkspaceLoadabilityRules";
import type { EtlWorkspaceLoadabilityRules } from "@etl/EtlConfig/EtlConfig.types";
import type {
  ApiResourceRelation,
  Relation,
} from "@etl/EtlEngine/EtlEngine.types";
import type { ListingRowValues } from "@etl/stores/EtlStores.types";

type _BuildArgs = Readonly<{
  relation: Relation;
  pipelineName: string;
  pipelineRunId: string;
  service: string | undefined;
  driveKey: string;
  driveId: string | undefined;
  syncedAt: Date;
  scopeKey: string;
  workspaceLoadability?: EtlWorkspaceLoadabilityRules;
}>;

type _SharedColumns = Omit<
  ListingRowValues,
  | "access_kind"
  | "api_service"
  | "api_base_url"
  | "api_resource_id"
  | "api_resource_format"
  | "parquet_file_name"
  | "date_column_type_last_verified"
  | "is_workspace_loadable"
  | "companion_listings"
  | "api_freshness_probe"
>;

type _DateField = "sourceUpdatedAt" | "coverageStartDate" | "coverageEndDate";

function _readIsoOrNull(relation: Relation, field: _DateField): string | null {
  const date = relation[field];
  if (date === undefined) {
    return null;
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Relation "${relation.displayName}" (external dataset id "${relation.externalDatasetId}") has an invalid ${field}.`,
    );
  }
  return date.toISOString();
}

function _buildSharedColumns(args: _BuildArgs): _SharedColumns {
  const { relation } = args;
  return {
    pipeline_name: args.pipelineName,
    pipeline_run_id: args.pipelineRunId,
    display_name: relation.displayName,
    organization1_name: relation.organization1Name,
    external_dataset_id: relation.externalDatasetId,
    date_of_last_update: _readIsoOrNull(relation, "sourceUpdatedAt"),
    date_of_last_sync: args.syncedAt.toISOString(),
    external_service_name: relation.externalServiceName ?? null,
    source_url: relation.sourceUrl ?? null,
    source_download_url: relation.sourceDownloadUrl ?? null,
    source_asset_type: relation.sourceAssetType ?? null,
    organization2_name: relation.organization2Name ?? null,
    organization3_name: relation.organization3Name ?? null,
    organization4_name: relation.organization4Name ?? null,
    domains: relation.domains ? [...relation.domains] : null,
    tags: relation.tags ? [...relation.tags] : null,
    additional_source_metadata: relation.additionalSourceMetadata ?? null,
    drive_id: args.driveId ?? null,
    canonical_urls: relation.canonicalUrls ? [...relation.canonicalUrls] : null,
    license: relation.license ?? null,
    update_frequency: relation.updateFrequency ?? null,
    description: relation.description ?? null,
    notes: relation.notes ?? null,
    metadata: relation.metadata ?? null,
    coverage_start_date: _readIsoOrNull(relation, "coverageStartDate"),
    coverage_end_date: _readIsoOrNull(relation, "coverageEndDate"),
    pipeline_scope_keys: [args.scopeKey],
  };
}

/**
 * Whether a workspace can load an API relation: the pipeline did not rule
 * the asset out, it has a format, and the rules do not list that format.
 */
function _isApiRelationLoadable(
  relation: ApiResourceRelation,
  rules: EtlWorkspaceLoadabilityRules | undefined,
): boolean {
  const format = relation.apiResourceFormat;
  if (relation.isWorkspaceLoadable === false || format === undefined) {
    return false;
  }
  return !(rules?.unloadableFormats ?? []).includes(normalizeEtlFormat(format));
}

/**
 * Builds the listings-table row one relation becomes, writing every contract
 * column and setting the other kind's columns to `null`. Companions and the
 * freshness probe are written only for an `api_resource` row: a
 * `pipeline_parquet` row gets no companions and no probe.
 *
 * @param args.relation - The relation a pipeline's `transform` returned.
 * @param args.pipelineName - Written to `pipeline_name`.
 * @param args.pipelineRunId - Written to `pipeline_run_id`.
 * @param args.service - Written to `api_service` on an `api_resource` row.
 * @param args.driveKey - Written to `api_base_url` on an `api_resource` row.
 * @param args.driveId - Written to `drive_id`, or null when undefined.
 * @param args.syncedAt - Written to `date_of_last_sync`.
 * @param args.scopeKey - The scope that produced the row, written to
 *   `pipeline_scope_keys`.
 * @param args.workspaceLoadability - The formats a workspace cannot load.
 *   An `api_resource` row is written unloadable when its relation says so,
 *   has no format, or has one of these. A `pipeline_parquet` row is always
 *   loadable.
 * @returns The row.
 * @throws When an `api_resource` relation has no `service` to write, or when
 * one of the relation's dates is invalid.
 */
export function buildListingRowFromRelation(
  args: _BuildArgs,
): ListingRowValues {
  const { relation } = args;
  const shared = _buildSharedColumns(args);
  if (relation.kind === "pipeline_parquet") {
    return {
      ...shared,
      access_kind: "pipeline_parquet",
      api_service: null,
      api_base_url: null,
      api_resource_id: null,
      api_resource_format: null,
      parquet_file_name: `${relation.tableBaseName}.parquet`,
      // Read from the Parquet file the engine writes, so always verified.
      date_column_type_last_verified: args.syncedAt.toISOString(),
      is_workspace_loadable: true,
      companion_listings: [],
      api_freshness_probe: null,
    };
  }
  if (args.service === undefined) {
    throw new Error(
      `EtlEngine needs a service to write the api_resource relation "${relation.displayName}".`,
    );
  }
  return {
    ...shared,
    access_kind: "api_resource",
    api_service: args.service,
    api_base_url: args.driveKey,
    api_resource_id: relation.apiResourceId,
    api_resource_format: relation.apiResourceFormat ?? null,
    parquet_file_name: null,
    date_column_type_last_verified:
      relation.columnTypesVerifiedAt?.toISOString() ?? null,
    is_workspace_loadable: _isApiRelationLoadable(
      relation,
      args.workspaceLoadability,
    ),
    companion_listings: relation.companions ? [...relation.companions] : [],
    api_freshness_probe: relation.freshnessProbe ?? null,
  };
}
