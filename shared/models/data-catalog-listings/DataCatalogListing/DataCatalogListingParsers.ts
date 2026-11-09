import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  omit,
  snakeCaseKeysDeep,
} from "@avandar/utils";
import { z } from "zod";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
import type { DataCatalogDriveId } from "$/models/data-catalog-listings/DataCatalogDrive/DataCatalogDrive.types.ts";
import type {
  DataCatalogListingId,
  DataCatalogListingModel,
  DataCatalogListingRead,
} from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  date_of_last_sync: z.iso.datetime({ offset: true }).nullable(),
  date_of_last_update: z.iso.datetime({ offset: true }).nullable(),
  coverage_start_date: z.iso.datetime({ offset: true }).nullable(),
  coverage_end_date: z.iso.datetime({ offset: true }).nullable(),
  parquet_file_name: z.string().nullable(),
  display_name: z.string(),
  pipeline_name: z.string().nullable(),
  pipeline_run_id: z.string().nullable(),
  organization1_name: z.string(),
  external_service_name: z.string().nullable(),
  external_dataset_id: z.string().nullable(),
  source_url: z.string().nullable(),
  canonical_urls: z.array(z.string()).nullable(),
  license: z.string().nullable(),
  update_frequency: z.string().nullable(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  metadata: supabaseJSONSchema.nullable(),
  access_kind: z.enum(["pipeline_parquet", "api_resource"]),
  api_service: z.enum(["ckan", "socrata"]).nullable(),
  api_base_url: z.string().nullable(),
  api_resource_id: z.string().nullable(),
  api_resource_format: z.string().nullable(),
  cached_object_path: z.string().nullable(),
  cached_source_version: z.string().nullable(),
  cached_at: z.iso.datetime({ offset: true }).nullable(),
  pipeline_scope_keys: z.array(z.string()),
  date_column_type_last_verified: z.iso.datetime({ offset: true }).nullable(),
  is_invalid: z.boolean(),
  invalid_dataset_reason: z
    .enum([
      "empty_dataset",
      "dataset_not_found",
      "authorization_required",
      "unsupported_format",
      "external_host",
      "unparseable_dataset",
      "unreachable_dataset",
    ])
    .nullable(),
  is_workspace_loadable: z.boolean(),
  source_asset_type: z.string().nullable(),
  source_download_url: z.string().nullable(),
  organization2_name: z.string().nullable(),
  organization3_name: z.string().nullable(),
  organization4_name: z.string().nullable(),
  domains: z.array(z.string()).nullable(),
  tags: z.array(z.string()).nullable(),
  additional_source_metadata: supabaseJSONSchema.nullable(),
  drive_id: z.uuid().nullable(),
  parquet_cache_status: z.enum(["building", "ready", "failed"]).nullable(),
  parquet_cache_build_id: z.uuid().nullable(),
  parquet_cache_build_started_at: z.iso.datetime({ offset: true }).nullable(),
  parquet_cache_failure_code: z.string().nullable(),
  parquet_cache_folder_path: z.string().nullable(),
  parquet_cache_part_count: z.number().nullable(),
  parquet_cache_source_version: z.string().nullable(),
  parquet_cache_built_at: z.iso.datetime({ offset: true }).nullable(),
  parquet_cache_row_count: z.number().nullable(),
  parquet_cache_byte_size: z.number().nullable(),
  search_vector: z.unknown(),
});

/**
 * Reads a listing row. `metadata` and `additional_source_metadata` are JSON
 * documents a pipeline wrote, not columns, so they keep their keys and nulls
 * exactly as stored: readers look up a source's own key names in them, and
 * the source's details are shown as the source sent them. Only a missing
 * document becomes undefined.
 */
function _fromDBReadToModelRead(
  dbRow: DataCatalogListingModel["DBRead"],
): DataCatalogListingRead {
  const { metadata, additional_source_metadata, ...columns } = dbRow;
  // The search document exists for catalog search in Postgres. Nothing in
  // the app reads it.
  const fields = nullsToUndefinedDeep(
    camelCaseKeysDeep(omit(columns, "search_vector")),
  );
  return {
    ...fields,
    id: fields.id as DataCatalogListingId,
    driveId: fields.driveId as DataCatalogDriveId | undefined,
    metadata: metadata ?? undefined,
    additionalSourceMetadata: additional_source_metadata ?? undefined,
  };
}

export const DataCatalogListingParsers =
  makeParserRegistry<DataCatalogListingModel>().build({
    modelName: "DataCatalogListing",
    DBReadSchema,
    fromDBReadToModelRead: _fromDBReadToModelRead,
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = DataCatalogListingModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
