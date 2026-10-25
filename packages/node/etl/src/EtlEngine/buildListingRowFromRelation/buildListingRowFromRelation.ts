import type { Relation } from "@etl/EtlEngine/EtlEngine.types";
import type { ListingRowValues } from "@etl/stores/EtlStores.types";

type _BuildArgs = Readonly<{
  relation: Relation;
  pipelineName: string;
  pipelineRunId: string;
  service: string | undefined;
  driveKey: string;
  syncedAt: Date;
  scopeKey: string;
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
    external_organization_name: relation.externalOrganizationName,
    external_dataset_id: relation.externalDatasetId,
    date_of_last_update: _readIsoOrNull(relation, "sourceUpdatedAt"),
    date_of_last_sync: args.syncedAt.toISOString(),
    external_service_name: relation.externalServiceName ?? null,
    source_url: relation.sourceUrl ?? null,
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
 * Builds the listings-table row one relation becomes, writing every contract
 * column and setting the other kind's columns to `null`.
 *
 * @param args.relation - The relation a pipeline's `transform` returned.
 * @param args.pipelineName - Written to `pipeline_name`.
 * @param args.pipelineRunId - Written to `pipeline_run_id`.
 * @param args.service - Written to `api_service` on an `api_resource` row.
 * @param args.driveKey - Written to `api_base_url` on an `api_resource` row.
 * @param args.syncedAt - Written to `date_of_last_sync`.
 * @param args.scopeKey - The scope that produced the row, written to
 *   `pipeline_scope_keys`.
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
    api_resource_format: relation.apiResourceFormat,
    parquet_file_name: null,
    date_column_type_last_verified:
      relation.columnTypesVerifiedAt?.toISOString() ?? null,
  };
}
