import { duckDbDescribeColumnTypeToSniffable, NodeDuckDb } from "@avandar/etl";
import type { RelationColumn } from "@avandar/etl";
import type { HdxFileColumnReader } from "@pipelines/hdx/readHdxResourceColumns/readHdxResourceColumns";

/** The file formats DuckDB reads columns from. */
type _ReadableFormat = "csv" | "parquet";

/** Reads one file's columns, given its path or URL and format. */
type _FileReader = (args: {
  path: string;
  format: _ReadableFormat;
}) => Promise<readonly RelationColumn[] | undefined>;

async function _readColumns(
  duckDb: NodeDuckDb,
  args: { path: string; format: _ReadableFormat },
): Promise<RelationColumn[]> {
  if (args.format === "csv") {
    const sniffed = await duckDb.sniffCsv({ csvPath: args.path });
    return sniffed.map((column) => {
      return {
        name: column.name,
        originalDataType: column.type,
        castDataType: column.type,
      };
    });
  }
  const parquet = await duckDb.summarizeParquetFile(args.path);
  return parquet.columnNames.map((name, index) => {
    const columnType = parquet.columnTypeDescriptions[index] ?? "VARCHAR";
    return {
      name,
      originalDataType: columnType,
      castDataType: duckDbDescribeColumnTypeToSniffable(columnType),
    };
  });
}

/**
 * Reads a file's column names and types with DuckDB, which reads a remote
 * file over HTTP range requests: only a Parquet file's footer, and only a
 * CSV's sample rows.
 *
 * @param args.path - A local path or URL.
 * @param args.format - How to read it.
 * @returns The columns, or `undefined` when the file has none or cannot be
 *   read. A read failure is logged with `console.warn`.
 */
export async function readFileColumnsWithDuckDb(args: {
  path: string;
  format: _ReadableFormat;
}): Promise<readonly RelationColumn[] | undefined> {
  const duckDb = new NodeDuckDb();
  try {
    const columns = await _readColumns(duckDb, args);
    return columns.length === 0 ? undefined : columns;
  } catch (error) {
    console.warn(
      `[hdx] could not read the columns of ${args.path}: ${String(error)}`,
    );
    return undefined;
  } finally {
    await duckDb.close();
  }
}

function _toReadableFormat(format: string): _ReadableFormat | undefined {
  const lowerCaseFormat = format.toLowerCase();
  return lowerCaseFormat === "csv" || lowerCaseFormat === "parquet"
    ? lowerCaseFormat
    : undefined;
}

/**
 * Creates the reader that HDX resources without usable headers fall back to.
 * It reads only an HTTPS file under the drive's base URL, so a resource URL
 * cannot point DuckDB at a local path or another host.
 *
 * @param args.baseUrl - The drive's base URL, e.g. `https://data.humdata.org`.
 * @param args.readFile - Replaces `readFileColumnsWithDuckDb`, for tests.
 */
export function createHdxFileColumnReader(args: {
  baseUrl: string;
  readFile?: _FileReader;
}): HdxFileColumnReader {
  const readFile = args.readFile ?? readFileColumnsWithDuckDb;
  const drivePrefix = `${args.baseUrl.replace(/\/+$/, "")}/`;
  return async (resource) => {
    const format = _toReadableFormat(resource.format);
    const isOnDrive =
      drivePrefix.startsWith("https://") &&
      resource.url.startsWith(drivePrefix);
    if (format === undefined || !isOnDrive) {
      return undefined;
    }
    return readFile({ path: resource.url, format });
  };
}
