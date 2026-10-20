import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { getEtlLoadDir } from "@etl/EtlEngine/etlPaths";
import { transformedCsvsToParquetBlobs } from "@etl/EtlEngine/transformedCsvsToParquetBlobs";
import { duckDbDescribeColumnTypeToSniffable } from "@etl/NodeDuckDb/DuckDbSniffableDataType";
import { NodeDuckDb } from "@etl/NodeDuckDb/NodeDuckDb";
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

type _ParquetFile = Readonly<{
  bytes: Uint8Array;
  sha256: string;
  rowCount: number;
  columnNames: readonly string[];
  columnTypes: readonly string[];
}>;

type _PrepareParquetRelationArgs = Readonly<{
  relation: PipelineParquetRelation;
  /** The relation's row from `buildListingRowFromRelation`. */
  row: ListingRowValues;
  /** The row already stored under the same conflict key, if any. */
  stored: StoredListingRow | undefined;
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
  objects: ObjectStore | undefined;
  bucket: string | undefined;
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

async function _buildParquetFile(args: {
  relation: PipelineParquetRelation;
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
}): Promise<_ParquetFile> {
  const { relation } = args;
  const [blob] = await transformedCsvsToParquetBlobs({
    transformOutputDir: dirname(relation.csvPath),
    descriptions: [
      {
        name: basename(relation.csvPath, ".csv"),
        columns: relation.csvColumns,
      },
    ],
  });
  if (blob === undefined) {
    throw new Error(
      `No Parquet was produced for "${relation.tableBaseName}".`,
    );
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const loadDir = getEtlLoadDir(args.pipelineName, args.pipelineRunId);
  await mkdir(loadDir, { recursive: true });
  const parquetPath = join(loadDir, `${relation.tableBaseName}.parquet`);
  await writeFile(parquetPath, bytes);
  return {
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...(await _summarizeParquetFile(parquetPath)),
  };
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

/**
 * Converts a Parquet relation's CSV to ZSTD Parquet, uploads it unless the
 * stored row already records the same SHA-256, and returns the row with the
 * engine's Parquet metadata (`open_data_bucket`, `storage_object_path`,
 * `table`, `parquet_sha256`) merged over the relation's own and the object's
 * public URL appended to `canonical_urls`. The columns come from the Parquet
 * file's `DESCRIBE`.
 *
 * @throws When no bucket is configured.
 */
export async function prepareParquetRelation(
  args: _PrepareParquetRelationArgs,
): Promise<PreparedParquetRelation> {
  const { relation, row, objects, bucket } = args;
  if (objects === undefined || bucket === undefined) {
    throw new Error(
      `EtlEngine needs output.bucket to write the pipeline_parquet relation "${relation.tableBaseName}".`,
    );
  }
  const parquet = await _buildParquetFile(args);
  const storagePath = `${args.pipelineName}/datasets/${relation.tableBaseName}.parquet`;
  if (args.stored?.metadata?.parquet_sha256 !== parquet.sha256) {
    await objects.upload({
      path: storagePath,
      bytes: parquet.bytes,
      contentType: PARQUET_CONTENT_TYPE,
    });
  }
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
  const canonicalUrls = [
    ...(row.canonical_urls ?? []),
    objects.getPublicUrl(storagePath),
  ];
  return {
    row: { ...row, metadata, canonical_urls: canonicalUrls },
    columns: _buildColumnRows(parquet),
  };
}
