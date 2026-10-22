import { UNKNOWN_ORIGINAL_DATA_TYPE } from "@avandar/etl";
import type { CkanResource } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { RelationColumn } from "@avandar/etl";

/**
 * Reads a Parquet resource's columns from the file's footer.
 *
 * @returns The columns, or `undefined` when the file cannot be read or has
 *   none.
 */
export type HdxFileColumnReader = (
  resource: Readonly<CkanResource>,
) => Promise<readonly RelationColumn[] | undefined>;

/** One resource's columns, and when their types were read from its data. */
export type HdxResourceColumns = Readonly<{
  columns: readonly RelationColumn[];
  /** Unset when the columns came from headers alone, with no types. */
  columnTypesVerifiedAt: Date | undefined;
}>;

/**
 * Whether headers name the columns exactly as DuckDB will when the app reads
 * the file. DuckDB renames a blank header and the second of two headers that
 * differ only in case, and a header with surrounding spaces may not survive
 * as written, so any of those sends the resource to its file instead.
 */
function _isUsableHeaderList(headers: readonly string[]): boolean {
  const lowerCaseHeaders = new Set(
    headers.map((header) => {
      return header.toLowerCase();
    }),
  );
  return (
    lowerCaseHeaders.size === headers.length &&
    headers.every((header) => {
      return header !== "" && header === header.trim();
    })
  );
}

/**
 * The columns of one HDX resource. The headers HDX's file structure check
 * recorded are used when they name the columns unambiguously. They carry no
 * types, so each column is text of unknown original type, unverified until
 * the app reads a sample. Otherwise a Parquet file's footer is read, which
 * gives real types, verified now, and a CSV gets no columns, unverified, to
 * be filled in when the app verifies its types.
 *
 * @param args.resource - The resource.
 * @param args.readFileColumns - Reads the columns from the file.
 * @returns The columns, or `undefined` when a Parquet file's columns cannot
 *   be read.
 */
export async function readHdxResourceColumns(args: {
  resource: Readonly<CkanResource>;
  readFileColumns: HdxFileColumnReader;
}): Promise<HdxResourceColumns | undefined> {
  const headers = args.resource.fileHeaders;
  if (headers !== undefined && _isUsableHeaderList(headers)) {
    return {
      columns: headers.map((header) => {
        return {
          name: header,
          originalDataType: UNKNOWN_ORIGINAL_DATA_TYPE,
          castDataType: "VARCHAR",
        };
      }),
      columnTypesVerifiedAt: undefined,
    };
  }
  if (args.resource.format.toLowerCase() !== "parquet") {
    // Reading a CSV here would mean downloading part of every such file on
    // every run, so its columns are filled in when its types are verified.
    return { columns: [], columnTypesVerifiedAt: undefined };
  }
  const fileColumns = await args.readFileColumns(args.resource);
  return fileColumns === undefined
    ? undefined
    : { columns: fileColumns, columnTypesVerifiedAt: new Date() };
}
