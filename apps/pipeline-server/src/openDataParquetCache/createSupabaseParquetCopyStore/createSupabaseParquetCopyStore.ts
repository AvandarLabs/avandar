import { readFile } from "node:fs/promises";
import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "$/types/database.types";
import type { ParquetCopyStore } from "@pipeline-server/openDataParquetCache/runParquetCopyBuild/runParquetCopyBuild";
import type { PipelineSupabaseTarget } from "@pipelines/shared/PipelineRunOptions.types";

/** The content type every pipeline uploads Parquet with. */
const PARQUET_CONTENT_TYPE = "application/vnd.apache.parquet";

/**
 * How long, in seconds, a browser may cache a copy's part. A part never
 * changes once uploaded, because each build writes to a folder of its own,
 * so a workspace that re-checks an unchanged copy reads its parts from the
 * browser's cache rather than downloading them again.
 */
const COPY_PART_CACHE_CONTROL_SECONDS = "31536000";

/** The most objects one Storage list call returns, and one remove takes. */
const STORAGE_PAGE_SIZE = 1000;

/** The bucket copies go to when the environment names none. */
const DEFAULT_OPEN_DATA_BUCKET = "opendata";

type SupabaseClient = ReturnType<typeof createClient<Database>>;

function _throwIfError(error: { message: string } | null): void {
  if (error !== null) {
    throw new Error(error.message);
  }
}

/**
 * Deletes every object under a folder, a page at a time. Each pass lists
 * from the start, since the last pass deleted what it listed.
 */
async function _removeFolder(
  bucket: ReturnType<SupabaseClient["storage"]["from"]>,
  folderPath: string,
): Promise<void> {
  for (;;) {
    const { data, error } = await bucket.list(folderPath, {
      limit: STORAGE_PAGE_SIZE,
    });
    _throwIfError(error);
    if (data === null || data.length === 0) {
      return;
    }
    const { error: removeError } = await bucket.remove(
      data.map((object) => {
        return `${folderPath}/${object.name}`;
      }),
    );
    _throwIfError(removeError);
  }
}

async function _readColumnNames(
  client: SupabaseClient,
  catalogListingId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("data_catalog_listings__relation_columns")
    .select("column_name")
    .eq("catalog_listing_id", catalogListingId);
  _throwIfError(error);
  return (data ?? []).map((column) => {
    return column.column_name;
  });
}

async function _readListing(client: SupabaseClient, catalogListingId: string) {
  const { data, error } = await client
    .from("data_catalog_listings")
    .select(
      "id, access_kind, pipeline_name, parquet_cache_build_id, api_base_url, api_resource_id, external_dataset_id, api_resource_format",
    )
    .eq("id", catalogListingId)
    .maybeSingle();
  _throwIfError(error);
  if (
    data === null ||
    data.access_kind !== "api_resource" ||
    data.api_base_url === null ||
    data.api_resource_id === null ||
    data.external_dataset_id === null
  ) {
    return undefined;
  }
  return {
    id: data.id,
    columnNames: await _readColumnNames(client, catalogListingId),
    pipelineName: data.pipeline_name ?? undefined,
    currentBuildId: data.parquet_cache_build_id ?? undefined,
    apiBaseUrl: data.api_base_url,
    apiResourceId: data.api_resource_id,
    externalDatasetId: data.external_dataset_id,
    apiResourceFormat: data.api_resource_format ?? undefined,
  };
}

/** The store's database half: the listing read and the four RPCs. */
function _createDatabaseStore(
  client: SupabaseClient,
): Omit<ParquetCopyStore, "uploadPart" | "removeFolder"> {
  return {
    readListing: async (catalogListingId) => {
      return await _readListing(client, catalogListingId);
    },
    writeCopy: async ({ catalogListingId, buildId, copy }) => {
      const { data, error } = await client.rpc(
        "rpc_data_catalog_listings__write_parquet_cache",
        {
          p_catalog_listing_id: catalogListingId,
          p_build_id: buildId,
          p_folder_path: copy.folderPath,
          p_part_count: copy.partCount,
          p_source_version: copy.sourceVersion,
          p_row_count: copy.rowCount,
          p_byte_size: copy.byteSize,
        },
      );
      _throwIfError(error);
      const [result] = data ?? [];
      return {
        isApplied: result?.is_applied ?? false,
        previousFolderPath: result?.previous_folder_path ?? undefined,
      };
    },
    failCopy: async ({ catalogListingId, buildId, code }) => {
      const { data, error } = await client.rpc(
        "rpc_data_catalog_listings__fail_parquet_cache",
        {
          p_catalog_listing_id: catalogListingId,
          p_build_id: buildId,
          p_failure_code: code,
        },
      );
      _throwIfError(error);
      return data === true;
    },
    markInvalid: async ({ catalogListingId, reason }) => {
      const { error } = await client.rpc(
        "rpc_data_catalog_listings__mark_invalid",
        { p_catalog_listing_id: catalogListingId, p_reason: reason },
      );
      _throwIfError(error);
    },
    writeVerifiedColumns: async ({ catalogListingId, columns }) => {
      const { error } = await client.rpc(
        "rpc_data_catalog_listings__write_verified_column_types",
        {
          p_catalog_listing_id: catalogListingId,
          p_columns: columns.map((column) => {
            return {
              column_name: column.name,
              cast_data_type: column.dataType,
            };
          }),
        },
      );
      _throwIfError(error);
    },
  };
}

/**
 * Creates the store a build reads its listing from and records its result
 * in: the Supabase project the build's request named, through the cache
 * RPCs, and that project's `opendata` bucket (or `SUPABASE_OPENDATA_BUCKET`)
 * for the copy's parts. The service role key stays in this client and is
 * never logged.
 *
 * @param supabase - The project the build's request named.
 */
export function createSupabaseParquetCopyStore(
  supabase: PipelineSupabaseTarget,
): ParquetCopyStore {
  const client = createClient<Database>(supabase.url, supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = client.storage.from(
    getPipelineEtlDestination().output.bucket ?? DEFAULT_OPEN_DATA_BUCKET,
  );
  return {
    ..._createDatabaseStore(client),
    uploadPart: async ({ objectPath, partPath }) => {
      const { error } = await bucket.upload(
        objectPath,
        await readFile(partPath),
        {
          contentType: PARQUET_CONTENT_TYPE,
          cacheControl: COPY_PART_CACHE_CONTROL_SECONDS,
          upsert: true,
        },
      );
      _throwIfError(error);
    },
    removeFolder: async (folderPath) => {
      await _removeFolder(bucket, folderPath);
    },
  };
}
