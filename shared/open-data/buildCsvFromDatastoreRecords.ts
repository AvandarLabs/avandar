import type { CkanDatastoreField } from "$/open-data/CkanClient/CkanClient.types.ts";

/** Characters that force a field to be quoted, per RFC 4180. */
const QUOTE_REQUIRED_PATTERN = /[",\r\n]/;

/**
 * Renders one value as a CSV field.
 *
 * An absent value becomes an empty **unquoted** field and an empty string
 * becomes an empty **quoted** field, which is the only way CSV can tell the two
 * apart. Note that DuckDB's reader collapses both to NULL unless it is given
 * `allow_quoted_nulls=false`, so the distinction survives this writer but not
 * every reader.
 *
 * A value that is neither a primitive nor absent is JSON encoded rather than
 * stringified, because `String({})` would write `[object Object]` and lose the
 * row's data silently.
 */
function _buildCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text =
    typeof value === "string" ? value
    : typeof value === "number" || typeof value === "boolean" ? `${value}`
    : (JSON.stringify(value) ?? "");

  if (text === "" || QUOTE_REQUIRED_PATTERN.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function _buildCsvRow(values: readonly unknown[]): string {
  return values.map(_buildCsvField).join(",");
}

/**
 * Renders CKAN datastore records as CSV text a SQL engine can read.
 *
 * Column order comes from `fields`, never from a record's own keys. A record is
 * a JSON object: its key order is not a contract, and a record that omits an
 * optional column would shift every later value on that row into the wrong
 * column. Reading each record by field id instead makes a missing value an
 * empty field in the right place.
 *
 * The output always ends with a newline, so appending pages of records produces
 * valid CSV rather than gluing two rows together.
 */
export function buildCsvFromDatastoreRecords(params: {
  fields: readonly CkanDatastoreField[];
  records: ReadonlyArray<Readonly<Record<string, unknown>>>;
}): string {
  const columnIds = params.fields.map((field) => {
    return field.id;
  });
  const rows = params.records.map((record) => {
    return _buildCsvRow(
      columnIds.map((columnId) => {
        return record[columnId];
      }),
    );
  });
  return [_buildCsvRow(columnIds), ...rows].join("\n") + "\n";
}
