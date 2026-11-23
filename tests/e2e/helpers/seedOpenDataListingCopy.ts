import { readFile } from "node:fs/promises";
import { DuckDBInstance } from "@duckdb/node-api";
import { buildParquetCachePartPaths } from "$/connectors/open-data/buildParquetCachePartPath/buildParquetCachePartPath";
import { DuckDbDataTypes } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { createSupabaseAdminClient } from "./supabaseAdminClient";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/** The public bucket the pipeline server writes Parquet copies to. */
const OPEN_DATA_BUCKET = "opendata";

type ParquetShape = {
  columns: ReadonlyArray<{ name: string; type: DuckDbDataType }>;
  rowCount: number;
};

/** Narrows a DuckDB type name to one a catalog column can be cast to. */
function _toDuckDbDataType(typeName: string): DuckDbDataType {
  const dataType = DuckDbDataTypes.find((knownType) => {
    return knownType === typeName;
  });
  if (dataType === undefined) {
    throw new Error(`e2e Parquet column type is not supported: ${typeName}`);
  }
  return dataType;
}

/** Reads a Parquet file's column names, DuckDB types, and row count. */
async function _readParquetShape(parquetPath: string): Promise<ParquetShape> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  try {
    const source = `read_parquet('${parquetPath.replaceAll("'", "''")}')`;
    const described = await connection.runAndReadAll(
      `DESCRIBE SELECT * FROM ${source}`,
    );
    const counted = await connection.runAndReadAll(
      `SELECT count(*)::INTEGER AS row_count FROM ${source}`,
    );
    return {
      columns: described.getRowObjects().map((row) => {
        return {
          name: String(row.column_name),
          type: _toDuckDbDataType(String(row.column_type)),
        };
      }),
      rowCount: Number(counted.getRowObjects()[0]!.row_count),
    };
  } finally {
    connection.closeSync();
    instance.closeSync();
  }
}

/** Removes every object in one `opendata` folder. */
async function _removeCopyFolder(
  admin: AdminClient,
  folderPath: string,
): Promise<void> {
  const { data: objects, error: listError } = await admin.storage
    .from(OPEN_DATA_BUCKET)
    .list(folderPath);
  if (listError) {
    throw new Error(`e2e copy list: ${listError.message}`);
  }
  if (objects.length === 0) {
    return;
  }
  const { error } = await admin.storage.from(OPEN_DATA_BUCKET).remove(
    objects.map((object) => {
      return `${folderPath}/${object.name}`;
    }),
  );
  if (error) {
    throw new Error(`e2e copy remove: ${error.message}`);
  }
}

/** Inserts a ready listing row that points at an uploaded copy. */
async function _insertListing(
  options: Readonly<{
    admin: AdminClient;
    listingId: string;
    folderPath: string;
    pipelineName: string;
    displayName: string;
    byteSize: number;
    rowCount: number;
  }>,
): Promise<void> {
  const { admin, listingId, folderPath, pipelineName } = options;
  const { error } = await admin.from("data_catalog_listings").insert({
    id: listingId,
    access_kind: "api_resource",
    display_name: options.displayName,
    organization1_name: "E2E Open Data Office",
    pipeline_name: pipelineName,
    pipeline_run_id: "e2e-run",
    api_service: "ckan",
    api_base_url: `https://${pipelineName}.invalid`,
    external_dataset_id: listingId,
    api_resource_id: `${listingId}-parquet`,
    api_resource_format: "PARQUET",
    date_column_type_last_verified: new Date().toISOString(),
    parquet_cache_status: "ready",
    parquet_cache_folder_path: folderPath,
    parquet_cache_part_count: 1,
    parquet_cache_source_version: "e2e-version",
    parquet_cache_built_at: new Date().toISOString(),
    parquet_cache_row_count: options.rowCount,
    parquet_cache_byte_size: options.byteSize,
  });
  if (error) {
    throw new Error(`e2e listing insert: ${error.message}`);
  }
}

/**
 * Seeds an open data catalog listing whose Parquet copy the pipeline server
 * has already built, from one local Parquet file. The copy is uploaded to
 * `opendata` as the listing's only part, and the listing's columns are the
 * file's columns.
 *
 * The listing's host is unreachable on purpose. The freshness check then
 * fails, and a failed check serves the copy as current, so nothing reaches a
 * real source.
 *
 * @param options.pipelineName Files the listing under a pipeline only its
 *   spec uses, so {@link deleteOpenDataListingCopies} removes exactly it.
 * @returns The new listing's id.
 */
export async function seedOpenDataListingCopy(
  options: Readonly<{
    admin: AdminClient;
    pipelineName: string;
    displayName: string;
    parquetPath: string;
  }>,
): Promise<string> {
  const { admin, pipelineName, displayName, parquetPath } = options;
  const listingId = crypto.randomUUID();
  const folderPath = `catalog-cache/${listingId}/${crypto.randomUUID()}`;
  const [partPath] = buildParquetCachePartPaths({ folderPath, partCount: 1 });
  const bytes = await readFile(parquetPath);
  const shape = await _readParquetShape(parquetPath);
  const { error: uploadError } = await admin.storage
    .from(OPEN_DATA_BUCKET)
    .upload(partPath!, bytes, {
      contentType: "application/vnd.apache.parquet",
      upsert: true,
    });
  if (uploadError) {
    throw new Error(`e2e copy upload: ${uploadError.message}`);
  }
  await _insertListing({
    admin,
    listingId,
    folderPath,
    pipelineName,
    displayName,
    byteSize: bytes.byteLength,
    rowCount: shape.rowCount,
  });
  const { error: columnsError } = await admin
    .from("data_catalog_listings__relation_columns")
    .insert(
      shape.columns.map((column, columnIndex) => {
        return {
          catalog_listing_id: listingId,
          column_name: column.name,
          display_order: columnIndex,
          original_data_type: column.type,
          cast_data_type: column.type,
        };
      }),
    );
  if (columnsError) {
    throw new Error(`e2e relation columns insert: ${columnsError.message}`);
  }
  return listingId;
}

/**
 * Deletes every listing filed under `pipelineName`, the datasets added from
 * them, and their copies in Storage. Deleting a listing deletes its
 * open-data source rows but not the datasets they belong to, so the
 * datasets go first.
 */
export async function deleteOpenDataListingCopies(
  options: Readonly<{ admin: AdminClient; pipelineName: string }>,
): Promise<void> {
  const { admin, pipelineName } = options;
  const { data: listings, error: listingsError } = await admin
    .from("data_catalog_listings")
    .select("id, parquet_cache_folder_path")
    .eq("pipeline_name", pipelineName);
  if (listingsError) {
    throw new Error(`e2e listing read: ${listingsError.message}`);
  }
  if (listings.length === 0) {
    return;
  }
  const listingIds = listings.map((listing) => {
    return listing.id;
  });
  await _deleteDatasetsAddedFromListings(admin, listingIds);
  for (const listing of listings) {
    if (listing.parquet_cache_folder_path !== null) {
      await _removeCopyFolder(admin, listing.parquet_cache_folder_path);
    }
  }
  const { error } = await admin
    .from("data_catalog_listings")
    .delete()
    .in("id", listingIds);
  if (error) {
    throw new Error(`e2e listing delete: ${error.message}`);
  }
}

/** Deletes the workspace datasets that were added from the listings. */
async function _deleteDatasetsAddedFromListings(
  admin: AdminClient,
  listingIds: readonly string[],
): Promise<void> {
  const { data: sources, error: sourcesError } = await admin
    .from("datasets__open_data")
    .select("dataset_id")
    .in("catalog_listing_id", listingIds);
  if (sourcesError) {
    throw new Error(`e2e open-data source read: ${sourcesError.message}`);
  }
  if (sources.length === 0) {
    return;
  }
  const { error } = await admin
    .from("datasets")
    .delete()
    .in(
      "id",
      sources.map((source) => {
        return source.dataset_id;
      }),
    );
  if (error) {
    throw new Error(`e2e dataset delete: ${error.message}`);
  }
}
