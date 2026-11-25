import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { getLoadParquetPathForTable } from "@etl/EtlEngine/etlFileHelpers";
import { transformedCsvsToParquetBlobs } from "@etl/EtlEngine/transformedCsvsToParquetBlobs";
import { duckDbDescribeColumnTypeToSniffable } from "@etl/NodeDuckDb/DuckDbSniffableDataType";
import { NodeDuckDb } from "@etl/NodeDuckDb/NodeDuckDb";
import type { CrawlMetricsRecorder } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import type {
  EtlPipelineRunId,
  PipelineParquetRelation,
} from "@etl/EtlEngine/EtlEngine.types";
import type {
  ListingRowValues,
  ObjectStore,
  RelationColumnRow,
  StoredListingRow,
} from "@etl/stores/EtlStores.types";

const PARQUET_CONTENT_TYPE = "application/vnd.apache.parquet";

/** Metadata keys that must all match the stored row to skip an upload. */
const UPLOADED_OBJECT_KEYS = [
  "parquet_sha256",
  "open_data_bucket",
  "storage_object_path",
] as const;

type _ParquetFile = Readonly<{
  bytes: Uint8Array;
  sha256: string;
  rowCount: number;
  columnNames: readonly string[];
  columnTypes: readonly string[];
}>;

type _PrepareParquetRelationArgs = Readonly<{
  relation: PipelineParquetRelation;
  /**
   * The relation's row from `buildListingRowFromRelation`, with the stored
   * row's scope keys merged in.
   */
  row: ListingRowValues;
  /** The row already stored under the same conflict key, if any. */
  stored: StoredListingRow | undefined;
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
  objects: ObjectStore | undefined;
  bucket: string | undefined;
  /** The crawl's metrics: build and upload times and sizes. */
  metrics: CrawlMetricsRecorder;
}>;

/** A Parquet relation's final row and the relation columns to write for it. */
export type PreparedParquetRelation = Readonly<{
  row: ListingRowValues;
  columns: readonly RelationColumnRow[];
}>;

async function _summarizeParquetFile(
  parquetPath: string,
): Promise<Omit<_ParquetFile, "bytes" | "sha256">> {
  const db = new NodeDuckDb();
  try {
    const summary = await db.summarizeParquetFile(parquetPath);
    return {
      rowCount: summary.rowCount,
      columnNames: summary.columnNames,
      columnTypes: summary.columnTypeDescriptions,
    };
  } finally {
    await db.close();
  }
}

async function _convertCsvToParquetBytes(
  relation: PipelineParquetRelation,
): Promise<Uint8Array> {
  const [blob] = await transformedCsvsToParquetBlobs({
    transformOutputDir: dirname(relation.csvPath),
    descriptions: [
      {
        name: basename(relation.csvPath, ".csv"),
        columns: relation.csvColumns,
      },
    ],
  }).catch((error: unknown) => {
    throw new Error(
      `Could not convert the CSV for "${relation.tableBaseName}" at ${relation.csvPath} to Parquet.`,
      { cause: error },
    );
  });
  if (blob === undefined) {
    throw new Error(`No Parquet was produced for "${relation.tableBaseName}".`);
  }
  return new Uint8Array(await blob.arrayBuffer());
}

async function _buildParquetFile(args: {
  relation: PipelineParquetRelation;
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
}): Promise<_ParquetFile> {
  const { relation } = args;
  const bytes = await _convertCsvToParquetBytes(relation);
  const parquetPath = getLoadParquetPathForTable({
    pipelineName: args.pipelineName,
    pipelineRunId: args.pipelineRunId,
    tableBaseName: relation.tableBaseName,
  });
  await mkdir(dirname(parquetPath), { recursive: true });
  await writeFile(parquetPath, bytes);
  return {
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...(await _summarizeParquetFile(parquetPath)),
  };
}

/**
 * Builds the Parquet file, timed as the crawl's Parquet build, and counts
 * the input CSV's size. The size is read after the conversion, so a missing
 * CSV fails with the conversion's error.
 */
async function _buildParquetFileTimed(
  args: _PrepareParquetRelationArgs,
): Promise<_ParquetFile> {
  return args.metrics.time("loadParquetBuildMs", async () => {
    const parquet = await _buildParquetFile(args);
    const csvStat = await stat(args.relation.csvPath);
    args.metrics.count("sourceCsvBytes", csvStat.size);
    return parquet;
  });
}

function _buildColumnRows(parquet: _ParquetFile): RelationColumnRow[] {
  return parquet.columnNames.map((columnName, index) => {
    const columnType = parquet.columnTypes[index] ?? "VARCHAR";
    return {
      column_name: columnName,
      display_order: index,
      original_data_type: columnType,
      cast_data_type: duckDbDescribeColumnTypeToSniffable(columnType),
    };
  });
}

function _isStoredObjectCurrent(options: {
  stored: StoredListingRow | undefined;
  metadata: Readonly<Record<string, unknown>>;
}): boolean {
  return UPLOADED_OBJECT_KEYS.every((key) => {
    return options.stored?.metadata?.[key] === options.metadata[key];
  });
}

/**
 * Uploads the object unless the stored row already records it, timing the
 * upload and counting its bytes and rows, or counting the skip.
 */
async function _uploadUnlessCurrent(args: {
  prepareArgs: _PrepareParquetRelationArgs;
  objects: ObjectStore;
  parquet: _ParquetFile;
  storagePath: string;
  metadata: Readonly<Record<string, unknown>>;
}): Promise<void> {
  const { metrics, stored } = args.prepareArgs;
  if (_isStoredObjectCurrent({ stored, metadata: args.metadata })) {
    metrics.count("parquetUploadsSkipped", 1);
    return;
  }
  await metrics.time("loadParquetUploadMs", () => {
    return args.objects.upload({
      path: args.storagePath,
      bytes: args.parquet.bytes,
      contentType: PARQUET_CONTENT_TYPE,
    });
  });
  metrics.count("parquetBytesWritten", args.parquet.bytes.byteLength);
  metrics.count("parquetRowsWritten", args.parquet.rowCount);
}

function _requireObjectStore(
  args: _PrepareParquetRelationArgs,
): Readonly<{ objects: ObjectStore; bucket: string }> {
  const { relation, objects, bucket } = args;
  if (bucket === undefined) {
    throw new Error(
      `EtlEngine needs output.bucket to write the pipeline_parquet relation "${relation.tableBaseName}".`,
    );
  }
  if (objects === undefined) {
    throw new Error(
      `EtlEngine needs supabase.url and supabase.serviceRoleKey, or a stores.objects override, to upload the pipeline_parquet relation "${relation.tableBaseName}".`,
    );
  }
  return { objects, bucket };
}

function _appendPublicUrl(options: {
  canonicalUrls: readonly string[] | null;
  publicUrl: string;
}): string[] {
  const urls = [...(options.canonicalUrls ?? [])];
  return urls.includes(options.publicUrl) ? urls : [...urls, options.publicUrl];
}

/**
 * Converts a Parquet relation's CSV to ZSTD Parquet, uploads it unless the
 * stored row already records the same SHA-256, bucket, and object path, and
 * returns the row with the engine's Parquet metadata (`open_data_bucket`,
 * `storage_object_path`, `table`, `parquet_sha256`) merged over the
 * relation's own and the object's public URL added to `canonical_urls`. The
 * columns come from the Parquet file's `DESCRIBE`.
 *
 * The skip trusts the stored row: an object deleted outside the pipeline is
 * not uploaded again while its row still records a matching hash. Run
 * `ava pipeline reset <pipeline>` to delete the rows, so the next run
 * uploads every object.
 *
 * @throws When no bucket or no object store is configured, or when the CSV
 * cannot be converted to Parquet.
 */
export async function prepareParquetRelation(
  args: _PrepareParquetRelationArgs,
): Promise<PreparedParquetRelation> {
  const { relation, row } = args;
  const { objects, bucket } = _requireObjectStore(args);
  const parquet = await _buildParquetFileTimed(args);
  const storagePath = `${args.pipelineName}/datasets/${relation.tableBaseName}.parquet`;
  const metadata = {
    ...(row.metadata ?? {}),
    open_data_bucket: bucket,
    storage_object_path: storagePath,
    table: {
      name: relation.tableBaseName,
      row_count: parquet.rowCount,
      column_names: [...parquet.columnNames],
    },
    parquet_sha256: parquet.sha256,
  };
  await _uploadUnlessCurrent({
    prepareArgs: args,
    objects,
    parquet,
    storagePath,
    metadata,
  });
  const canonicalUrls = _appendPublicUrl({
    canonicalUrls: row.canonical_urls,
    publicUrl: objects.getPublicUrl(storagePath),
  });
  return {
    row: { ...row, metadata, canonical_urls: canonicalUrls },
    columns: _buildColumnRows(parquet),
  };
}
