import { MIMEType, promiseMap } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { registerParquetFile } from "@/clients/DuckDbClient/duckDbFileRegistry";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";

function _parquetBlobWithType(parquetBlob: Blob): Blob {
  return parquetBlob.type === MIMEType.APPLICATION_PARQUET
    ? parquetBlob
    : new Blob([parquetBlob], { type: MIMEType.APPLICATION_PARQUET });
}

/**
 * One Parquet blob holding every row of `parquetBlobs`, in order: all of the
 * first blob's rows, then the second's, and so on. The blobs must share one
 * schema, as the parts of one Parquet copy do. A single blob is returned
 * unchanged.
 */
export async function mergeParquetBlobs(
  options: Readonly<{
    client: DuckDbClientOperations;
    datasetDuckDbLease: DatasetDuckDbLease;
    parquetBlobs: readonly Blob[];
  }>,
): Promise<Blob> {
  const [firstBlob, ...otherBlobs] = options.parquetBlobs;
  if (firstBlob !== undefined && otherBlobs.length === 0) {
    return firstBlob;
  }
  const fileNames = options.parquetBlobs.map(() => {
    return `ava_part_${uuid()}`;
  });
  const db = await options.client.getDb();
  try {
    await Promise.all(
      fileNames.map(async (fileName, index) => {
        await registerParquetFile({
          blob: _parquetBlobWithType(options.parquetBlobs[index]!),
          db,
          tableName: fileName,
        });
      }),
    );
    const fileList = fileNames
      .map((_fileName, index) => {
        return `'$part${index}$'`;
      })
      .join(", ");
    return await options.client.runRawQuery(
      `SELECT * FROM read_parquet([${fileList}])`,
      {
        datasetDuckDbLease: options.datasetDuckDbLease,
        params: Object.fromEntries(
          fileNames.map((fileName, index) => {
            return [`part${index}`, fileName];
          }),
        ),
        returnType: "parquet",
        [TRUSTED_INTERNAL_SQL]: true,
      },
    );
  } finally {
    await promiseMap(fileNames, async (fileName) => {
      await db.dropFile(fileName);
    });
  }
}
