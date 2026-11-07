import { MIMEType } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { uuid } from "$/lib/uuid";
import { normalizeColumns } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { registerParquetFile } from "@/clients/DuckDbClient/duckDbFileRegistry";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";

function _parquetBlobWithType(parquetBlob: Blob): Blob {
  return parquetBlob.type === MIMEType.APPLICATION_PARQUET
    ? parquetBlob
    : new Blob([parquetBlob], { type: MIMEType.APPLICATION_PARQUET });
}

function _getNormalizedColumns(
  columns: readonly string[],
): readonly string[] {
  const normalized = normalizeColumns(columns);
  if (normalized === "all" || normalized.length === 0) {
    throw new Error("projectParquetBlob requires at least one column");
  }
  return normalized;
}

/**
 * The requested names that are real columns of the file, spelled as the file
 * spells them.
 *
 * The requested names come from reading the query's tokens, which also
 * collects CTE names, aliases used outside their scope, and keywords such as
 * `QUALIFY`. Projecting a name the file lacks fails the whole query with a
 * binder error, so only the file's own columns are kept. DuckDB matches
 * identifiers without regard to case, so the match here does too.
 */
async function _getColumnsInFile(
  options: Readonly<{
    client: DuckDbClientOperations;
    columns: readonly string[];
    datasetDuckDbLease: DatasetDuckDbLease;
    fileName: string;
  }>,
): Promise<string[]> {
  const schema = await options.client.runRawQuery<{ column_name: string }>(
    `DESCRIBE SELECT * FROM read_parquet('$fileName$')`,
    {
      datasetDuckDbLease: options.datasetDuckDbLease,
      params: { fileName: options.fileName },
      returnType: "js",
      [TRUSTED_INTERNAL_SQL]: true,
    },
  );
  const fileColumnByLowerName = new Map(
    schema.data.map((row) => {
      return [row.column_name.toLowerCase(), row.column_name];
    }),
  );
  const columnsInFile = options.columns.flatMap((columnName) => {
    const fileColumn = fileColumnByLowerName.get(columnName.toLowerCase());
    return fileColumn === undefined ? [] : [fileColumn];
  });
  return [...new Set(columnsInFile)].sort();
}

/**
 * A new Parquet blob holding only `columns`, in the source file's row order.
 *
 * Names in `columns` that the file does not have are left out. When none of
 * them is a column of the file, the source blob is returned unchanged.
 *
 * The COPY is a bare `SELECT` list: no `DISTINCT`, `GROUP BY`, or `ORDER BY`.
 */
export async function projectParquetBlob(
  options: Readonly<{
    client: DuckDbClientOperations;
    columns: readonly string[];
    datasetDuckDbLease: DatasetDuckDbLease;
    parquetBlob: Blob;
  }>,
): Promise<Blob> {
  const requestedColumns = _getNormalizedColumns(options.columns);
  const fileName = `ava_proj_${uuid()}`;
  const db = await options.client.getDb();
  await registerParquetFile({
    blob: _parquetBlobWithType(options.parquetBlob),
    db,
    tableName: fileName,
  });
  try {
    const columnsInFile = await _getColumnsInFile({
      client: options.client,
      columns: requestedColumns,
      datasetDuckDbLease: options.datasetDuckDbLease,
      fileName,
    });
    if (columnsInFile.length === 0) {
      return options.parquetBlob;
    }
    const selectList = columnsInFile.map(quoteSqlIdentifier).join(", ");
    return await options.client.runRawQuery(
      `SELECT ${selectList} FROM read_parquet('$fileName$')`,
      {
        datasetDuckDbLease: options.datasetDuckDbLease,
        params: { fileName },
        returnType: "parquet",
        [TRUSTED_INTERNAL_SQL]: true,
      },
    );
  } finally {
    await db.dropFile(fileName);
  }
}
