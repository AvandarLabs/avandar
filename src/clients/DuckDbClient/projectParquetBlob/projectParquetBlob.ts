import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";

import { MIMEType } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";

import { uuid } from "$/lib/uuid";
import { normalizeColumns } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { registerParquetFile } from "@/clients/DuckDbClient/duckDbFileRegistry";

function _parquetBlobWithType(parquetBlob: Blob): Blob {
  return parquetBlob.type === MIMEType.APPLICATION_PARQUET
    ? parquetBlob
    : new Blob([parquetBlob], { type: MIMEType.APPLICATION_PARQUET });
}

function _getProjectedSelectList(columns: readonly string[]): string {
  const normalized = normalizeColumns(columns);
  if (normalized === "all" || normalized.length === 0) {
    throw new Error("projectParquetBlob requires at least one column");
  }
  return normalized.map(quoteSqlIdentifier).join(", ");
}

/**
 * A new Parquet blob holding only `columns`, in the source file's row order.
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
  const selectList = _getProjectedSelectList(options.columns);
  const fileName = `ava_proj_${uuid()}`;
  const db = await options.client.getDb();
  await registerParquetFile({
    blob: _parquetBlobWithType(options.parquetBlob),
    db,
    tableName: fileName,
  });
  try {
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
