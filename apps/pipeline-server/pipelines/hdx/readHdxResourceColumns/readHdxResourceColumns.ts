import type { CkanResource } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { RelationColumn } from "@avandar/etl";

/**
 * Reads a resource's columns from the file itself.
 *
 * @returns The columns, or `undefined` when the file cannot be read or has
 *   none.
 */
export type HdxFileColumnReader = (
  resource: Readonly<CkanResource>,
) => Promise<readonly RelationColumn[] | undefined>;

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
 * types, so each column is text. Otherwise the file itself is read, which
 * gives types too.
 *
 * @param args.resource - The resource.
 * @param args.readFileColumns - Reads the columns from the file.
 * @returns The columns, or `undefined` when neither source has any.
 */
export async function readHdxResourceColumns(args: {
  resource: Readonly<CkanResource>;
  readFileColumns: HdxFileColumnReader;
}): Promise<readonly RelationColumn[] | undefined> {
  const headers = args.resource.fileHeaders;
  if (headers !== undefined && _isUsableHeaderList(headers)) {
    return headers.map((header) => {
      return {
        name: header,
        originalDataType: "VARCHAR",
        castDataType: "VARCHAR",
      };
    });
  }
  return args.readFileColumns(args.resource);
}
