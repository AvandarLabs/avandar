import { MIMEType } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { registerParquetFile } from "@/clients/DuckDbClient/duckDbFileRegistry";
import type {
  DuckDbColumnSchema,
  UnknownRow,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";

/**
 * The first `maxPreviewRows` rows of a Parquet blob, and the blob's column
 * schema, read without loading the blob into a table.
 *
 * The blob is registered as a temporary file for the two reads and dropped
 * afterwards, so a preview never leaves a table or file behind. Both reads
 * share one connection, which serializes them anyway.
 */
export async function previewParquetBlob(
  options: Readonly<{
    client: DuckDbClientOperations;
    parquetBlob: Blob;
    maxPreviewRows: number;
  }>,
): Promise<{ columns: DuckDbColumnSchema[]; previewRows: UnknownRow[] }> {
  const { client } = options;
  const fileName = `ava_preview_${uuid()}`;
  const db = await client.getDb();
  await registerParquetFile({
    blob:
      options.parquetBlob.type === MIMEType.APPLICATION_PARQUET
        ? options.parquetBlob
        : new Blob([options.parquetBlob], {
            type: MIMEType.APPLICATION_PARQUET,
          }),
    db,
    tableName: fileName,
  });
  const conn = await client.connect();
  try {
    const queryOptions = {
      conn,
      params: { fileName },
      returnType: "js" as const,
      [TRUSTED_INTERNAL_SQL]: true as const,
    };
    const columnsResult = await client.runRawQuery<DuckDbColumnSchema>(
      `DESCRIBE SELECT * FROM read_parquet('$fileName$')`,
      queryOptions,
    );
    // react-doctor-disable-next-line
    const previewResult = await client.runRawQuery<UnknownRow>(
      `SELECT * FROM read_parquet('$fileName$') LIMIT ${Math.floor(options.maxPreviewRows)}`,
      queryOptions,
    );
    return { columns: columnsResult.data, previewRows: previewResult.data };
  } finally {
    await client.closeConnection(conn);
    await db.dropFile(fileName);
  }
}
