import { duckDbDescribeColumnTypeToSniffable, NodeDuckDb } from "@avandar/etl";
import type { RelationColumn } from "@avandar/etl";
import type { HdxFileColumnReader } from "@pipelines/hdx/readHdxResourceColumns/readHdxResourceColumns";

/** Reads one Parquet file's columns, given its path or URL. */
type _ParquetReader = (
  path: string,
) => Promise<readonly RelationColumn[] | undefined>;

/**
 * Reads a Parquet file's column names and types with DuckDB, which reads a
 * remote file's footer over HTTP range requests rather than the whole file.
 *
 * @param path - A local path or URL.
 * @returns The columns, or `undefined` when the file has none or cannot be
 *   read. A read failure is logged with `console.warn`.
 */
export async function readParquetColumnsWithDuckDb(
  path: string,
): Promise<readonly RelationColumn[] | undefined> {
  const duckDb = new NodeDuckDb();
  try {
    const parquet = await duckDb.summarizeParquetFile(path);
    const columns = parquet.columnNames.map((name, index) => {
      const columnType = parquet.columnTypeDescriptions[index] ?? "VARCHAR";
      return {
        name,
        originalDataType: columnType,
        castDataType: duckDbDescribeColumnTypeToSniffable(columnType),
      };
    });
    return columns.length === 0 ? undefined : columns;
  } catch (error) {
    console.warn(
      `[hdx] could not read the columns of ${path}: ${String(error)}`,
    );
    return undefined;
  } finally {
    await duckDb.close();
  }
}

/**
 * Creates the reader that HDX Parquet resources without usable headers fall
 * back to. It reads only a Parquet file served over HTTPS under the drive's
 * base URL, so a resource URL cannot point DuckDB at a local path or another
 * host.
 *
 * @param args.baseUrl - The drive's base URL, e.g. `https://data.humdata.org`.
 * @param args.readParquet - Replaces `readParquetColumnsWithDuckDb`, for
 *   tests.
 */
export function createHdxFileColumnReader(args: {
  baseUrl: string;
  readParquet?: _ParquetReader;
}): HdxFileColumnReader {
  const readParquet = args.readParquet ?? readParquetColumnsWithDuckDb;
  const drivePrefix = `${args.baseUrl.replace(/\/+$/, "")}/`;
  return async (resource) => {
    const isOnDrive =
      drivePrefix.startsWith("https://") &&
      resource.url.startsWith(drivePrefix);
    if (resource.format.toLowerCase() !== "parquet" || !isOnDrive) {
      return undefined;
    }
    return readParquet(resource.url);
  };
}
