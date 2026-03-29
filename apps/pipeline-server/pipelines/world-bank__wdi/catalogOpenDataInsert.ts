import { duckDBDescribeColumnTypeToSniffable } from "@ava-etl/NodeDuckDB/DuckDBSniffableDataType";
import { getWdiCatalogDatasetPresentation } from "@pipelines/world-bank__wdi/wdiCatalogDatasetConfig";
import { createClient } from "@supabase/supabase-js";
import type { NodeDuckDB } from "@ava-etl/NodeDuckDB/NodeDuckDB";
import type { SupabaseClient } from "@supabase/supabase-js";

const OPENDATA_BUCKET_DEFAULT = "opendata";

const WDI_SOURCE_URL =
  "https://data.worldbank.org/data-catalog/world-development-indicators";

/** Min/max calendar years for one Parquet table (WDI `Year` column). */
export type WdiYearCoverage = Readonly<{
  minYear: number;
  maxYear: number;
}>;

/**
 * Per-dataset stats from DuckDB before uploading Parquet to storage.
 * `tableBaseName` matches the CSV stem and storage object name.
 */
export type WdiTableParquetSummary = Readonly<{
  tableBaseName: string;
  rowCount: number;
  columnNames: readonly string[];
  /** Parallel DuckDB `column_type` strings from `DESCRIBE`. */
  columnTypeDescriptions: readonly string[];
  yearCoverage: WdiYearCoverage | undefined;
}>;

/**
 * Maps DuckDB `DESCRIBE` `column_type` to `datasets__duckdb_data_type`.
 */
function mapDescribeColumnTypeToCastDataType(
  columnType: string,
): ReturnType<typeof duckDBDescribeColumnTypeToSniffable> {
  return duckDBDescribeColumnTypeToSniffable(columnType);
}

/**
 * Creates a Supabase client using the service role key (bypasses RLS).
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Inserting catalog_entries__open_data requires SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function _getOpenDataBucket(): string {
  return process.env.SUPABASE_OPENDATA_BUCKET ?? OPENDATA_BUCKET_DEFAULT;
}

function _escapeSQLSingleQuotedString(value: string): string {
  return value.replace(/'/g, "''");
}

function _quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Returns min/max calendar years from a `Year` column in Parquet, if present.
 * Handles numeric years and World Bank string codes such as `YR1960`.
 */
export async function getWdiYearCoverageFromParquet(options: {
  db: NodeDuckDB;
  parquetPath: string;
  columnNames: readonly string[];
}): Promise<WdiYearCoverage | undefined> {
  const { db, parquetPath, columnNames } = options;
  const yearColumn = columnNames.find((name) => {
    return name.toLowerCase() === "year";
  });

  if (yearColumn === undefined) {
    return undefined;
  }

  const pathLiteral = _escapeSQLSingleQuotedString(parquetPath);
  const yearIdent = _quoteIdentifier(yearColumn);
  const yearAsText = `CAST(${yearIdent} AS VARCHAR)`;
  const yearDigits = `TRY_CAST(regexp_extract(${yearAsText}, '([0-9]{4})', 1) AS BIGINT)`;
  const sql =
    `SELECT MIN(${yearDigits}) AS min_y, MAX(${yearDigits}) AS max_y ` +
    `FROM read_parquet('${pathLiteral}')`;
  const rows = await db.runRawQuery<{
    min_y: bigint | number | null;
    max_y: bigint | number | null;
  }>(sql);
  const row = rows[0];

  if (!row || row.min_y === null || row.max_y === null) {
    return undefined;
  }

  const minYear = Number(row.min_y);
  const maxYear = Number(row.max_y);

  if (Number.isNaN(minYear) || Number.isNaN(maxYear)) {
    return undefined;
  }

  return { minYear, maxYear };
}

function _coverageStartIso(minYear: number): string {
  return new Date(Date.UTC(minYear, 0, 1, 0, 0, 0, 0)).toISOString();
}

function _coverageEndIso(maxYear: number): string {
  return new Date(Date.UTC(maxYear, 11, 31, 23, 59, 59, 999)).toISOString();
}

function _buildMetadataForTable(options: {
  bucket: string;
  storagePrefix: string;
  summary: WdiTableParquetSummary;
}): Record<string, unknown> {
  const { bucket, storagePrefix, summary } = options;
  const metadata: Record<string, unknown> = {
    open_data_bucket: bucket,
    storage_object_path: `${storagePrefix}/${summary.tableBaseName}.parquet`,
    table: {
      name: summary.tableBaseName,
      row_count: summary.rowCount,
      column_names: [...summary.columnNames],
    },
  };

  if (summary.yearCoverage !== undefined) {
    metadata.year_coverage = {
      min_year: summary.yearCoverage.minYear,
      max_year: summary.yearCoverage.maxYear,
    };
  }

  return metadata;
}

/**
 * Upserts one `catalog_entries__open_data` row per loaded Parquet dataset.
 * `parquet_file_name` is the Parquet object stem (e.g. `series.parquet`).
 * Conflicts on (`parquet_file_name`, `pipeline_name`) replace the existing row.
 */
export async function upsertWorldBankWdiCatalogEntry(options: {
  supabase: SupabaseClient;
  pipelineName: string;
  pipelineRunId: string;
  tableSummaries: readonly WdiTableParquetSummary[];
}): Promise<void> {
  const { supabase, pipelineName, pipelineRunId, tableSummaries } = options;
  const bucket = _getOpenDataBucket();
  const prefix = `${pipelineName}/datasets`;
  const nowIso = new Date().toISOString();

  const rows = tableSummaries.map((summary) => {
    const presentation = getWdiCatalogDatasetPresentation({
      tableBaseName: summary.tableBaseName,
    });
    const objectPath = `${prefix}/${summary.tableBaseName}.parquet`;
    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    const publicParquetUrl = data.publicUrl;

    const coverageStart =
      summary.yearCoverage ?
        _coverageStartIso(summary.yearCoverage.minYear)
      : undefined;
    const coverageEnd =
      summary.yearCoverage ?
        _coverageEndIso(summary.yearCoverage.maxYear)
      : undefined;

    const parquetFileName = `${summary.tableBaseName}.parquet`;

    return {
      display_name: presentation.display_name,
      parquet_file_name: parquetFileName,
      date_of_last_sync: nowIso,
      coverage_start_date: coverageStart,
      coverage_end_date: coverageEnd,
      pipeline_name: pipelineName,
      pipeline_run_id: pipelineRunId,
      external_organization_name: "World Bank",
      external_service_name: "World Development Indicators API",
      external_dataset_id: summary.tableBaseName,
      source_url: WDI_SOURCE_URL,
      canonical_urls: [
        WDI_SOURCE_URL,
        "https://api.worldbank.org/v2/",
        "https://datacatalog.worldbank.org/search/dataset/0037712",
        publicParquetUrl,
      ],
      license: "CC BY 4.0",
      update_frequency: "Annual",
      description: presentation.description,
      metadata: _buildMetadataForTable({
        bucket,
        storagePrefix: prefix,
        summary,
      }),
    };
  });

  const { data: upsertedEntries, error } = await supabase
    .from("catalog_entries__open_data")
    .upsert(rows, {
      onConflict: "parquet_file_name,pipeline_name",
    })
    .select("id, parquet_file_name");

  if (error) {
    throw new Error(
      `catalog_entries__open_data upsert failed: ${error.message}`,
    );
  }

  if (!upsertedEntries || upsertedEntries.length === 0) {
    return;
  }

  const upsertedCatalogEntryIds = upsertedEntries.map((row) => {
    return row.id;
  });

  const { error: deleteColumnsError } = await supabase
    .from("catalog_entries__dataset_column")
    .delete()
    .in("catalog_entry_id", upsertedCatalogEntryIds);

  if (deleteColumnsError) {
    throw new Error(
      `catalog_entries__dataset_column delete failed: ` +
        `${deleteColumnsError.message}`,
    );
  }

  const columnRows: Array<{
    catalog_entry_id: string;
    column_name: string;
    display_order: number;
    original_data_type: string;
    cast_data_type: ReturnType<typeof mapDescribeColumnTypeToCastDataType>;
  }> = [];

  for (const summary of tableSummaries) {
    const expectedParquetFileName = `${summary.tableBaseName}.parquet`;
    const catalogEntryId = upsertedEntries.find((row) => {
      return row.parquet_file_name === expectedParquetFileName;
    })?.id;

    if (!catalogEntryId) {
      continue;
    }

    if (summary.columnNames.length !== summary.columnTypeDescriptions.length) {
      throw new Error(
        `Column name / type length mismatch for table "${summary.tableBaseName}".`,
      );
    }

    summary.columnNames.forEach((columnName, columnIdx) => {
      const typeDescription = summary.columnTypeDescriptions[columnIdx];
      if (typeDescription === undefined) {
        throw new Error(
          `Missing column type for "${columnName}" in "${summary.tableBaseName}".`,
        );
      }

      columnRows.push({
        catalog_entry_id: catalogEntryId,
        column_name: columnName,
        display_order: columnIdx,
        original_data_type: typeDescription,
        cast_data_type: mapDescribeColumnTypeToCastDataType(typeDescription),
      });
    });
  }

  if (columnRows.length === 0) {
    return;
  }

  const { error: insertColumnsError } = await supabase
    .from("catalog_entries__dataset_column")
    .insert(columnRows);

  if (insertColumnsError) {
    throw new Error(
      `catalog_entries__dataset_column insert failed: ` +
        `${insertColumnsError.message}`,
    );
  }
}
