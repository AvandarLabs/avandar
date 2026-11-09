import { open, stat } from "node:fs/promises";
import {
  copyQueryRowsToParquetParts,
  quoteSqlText,
  withConversionDuckDb,
} from "@pipeline-server/openDataParquetCache/convertToParquetParts/convertToParquetParts";
import type { ListingDownloadColumn } from "@avandar/etl";

/**
 * How much memory a JSON conversion may use. DuckDB's JSON reader holds the
 * whole response as one object, which peaked at about 1 GB for GHO's largest
 * indicator, so a source larger than this fails its own build with an out of
 * memory error rather than taking the machine down for every other build.
 */
export const JSON_COPY_MEMORY_LIMIT = "1.5GB";

/** DuckDB's own default `maximum_object_size`, the least this ever sets. */
const DEFAULT_MAXIMUM_OBJECT_BYTES = 16 * 1024 * 1024;

const MEBIBYTE = 1024 * 1024;

/**
 * A name that is safe to quote as an identifier inside the `STRUCT(...)`
 * type string, which itself sits inside a SQL string literal.
 */
const PLAIN_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function _quotePlainIdentifier(name: string): string {
  if (!PLAIN_IDENTIFIER.test(name)) {
    throw new Error(
      `JSON copy refuses ${JSON.stringify(name)}: a records field or column name must be a plain identifier (letters, digits, and _).`,
    );
  }
  return `"${name}"`;
}

/**
 * The JSON text's size in bytes. A `.gz` file's is the gzip trailer's
 * uncompressed size, which is exact for any file under 4 GB.
 */
async function _readUncompressedBytes(jsonPath: string): Promise<number> {
  if (!jsonPath.endsWith(".gz")) {
    return (await stat(jsonPath)).size;
  }
  const file = await open(jsonPath, "r");
  try {
    const { size } = await file.stat();
    const trailer = Buffer.alloc(4);
    await file.read(trailer, 0, 4, size - 4);
    return trailer.readUInt32LE(0);
  } finally {
    await file.close();
  }
}

/**
 * The struct each record is read as. A `TIMESTAMP` column is read as
 * `TIMESTAMPTZ`, so a value's UTC offset is applied rather than dropped.
 */
function _buildRecordStructType(
  columns: readonly ListingDownloadColumn[],
): string {
  const fields = columns.map((column) => {
    const readType =
      column.dataType === "TIMESTAMP" ? "TIMESTAMPTZ" : column.dataType;
    return `${_quotePlainIdentifier(column.name)} ${readType}`;
  });
  return `STRUCT(${fields.join(", ")})[]`;
}

function _buildOuterSelectList(
  columns: readonly ListingDownloadColumn[],
): string {
  return columns
    .map((column) => {
      const name = _quotePlainIdentifier(column.name);
      return column.dataType === "TIMESTAMP"
        ? `${name}::TIMESTAMP AS ${name}`
        : name;
    })
    .join(", ");
}

/**
 * Converts a JSON file holding one object, whose `recordsField` is an array
 * of row objects, into ZSTD Parquet parts in `partsDir`, and returns their
 * paths in row order. A JSON API that answers one whole response, such as
 * GHO's OData, is copied this way.
 *
 * Every column is read with its declared type, so a value that does not fit
 * fails the conversion rather than becoming null. A `TIMESTAMP` value with
 * a UTC offset is stored as its UTC time. The conversion runs under
 * `JSON_COPY_MEMORY_LIMIT`, because the reader holds the whole object.
 *
 * @param options.jsonPath The JSON file. A `.gz` name is read as gzipped.
 * @param options.recordsField The top-level field holding the rows.
 * @param options.columns Every column, in the order the parts hold them.
 * @param options.partsDir An empty directory to write the parts into.
 * @param options.maxPartBytes About how large each part may grow.
 * @throws When the records field or a column name is not a plain identifier.
 */
export async function convertJsonFileToParquetParts(
  options: Readonly<{
    jsonPath: string;
    recordsField: string;
    columns: readonly ListingDownloadColumn[];
    partsDir: string;
    maxPartBytes: number;
  }>,
): Promise<string[]> {
  const recordsField = _quotePlainIdentifier(options.recordsField);
  const structType = _buildRecordStructType(options.columns);
  const selectList = _buildOuterSelectList(options.columns);
  const jsonBytes = await _readUncompressedBytes(options.jsonPath);
  const maximumObjectBytes = Math.max(
    DEFAULT_MAXIMUM_OBJECT_BYTES,
    Math.ceil((jsonBytes + 1) / MEBIBYTE) * MEBIBYTE,
  );
  return await withConversionDuckDb(
    async (db) => {
      // Offsets are applied in the session time zone, so UTC keeps them UTC.
      await db.execSQL("SET TimeZone = 'UTC';");
      return await copyQueryRowsToParquetParts({
        db,
        selectSql:
          `SELECT ${selectList} FROM (` +
          `SELECT unnest(${recordsField}, recursive := true) ` +
          `FROM read_json(${quoteSqlText(options.jsonPath)}, ` +
          `maximum_object_size = ${maximumObjectBytes}, ` +
          `columns = {${recordsField}: ${quoteSqlText(structType)}}))`,
        partsDir: options.partsDir,
        maxPartBytes: options.maxPartBytes,
      });
    },
    { memoryLimit: JSON_COPY_MEMORY_LIMIT },
  );
}
