/**
 * The text one driver value is written as, before any CSV quoting. Each
 * non-string shape the driver can return gets the text a CSV reader parses
 * back to the same value, never `JSON.stringify` alone: that wraps a `Date`
 * in literal quote characters, writes `NaN` and the infinities as `null`, and
 * writes bytes as a JSON array of numbers.
 */
function _toFieldText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }
  if (value instanceof Uint8Array) {
    // Postgres's own `bytea` hex output format.
    const hexDigits = Array.from(value, (byte) => {
      return byte.toString(16).padStart(2, "0");
    });
    return `\\x${hexDigits.join("")}`;
  }
  return JSON.stringify(value);
}

/**
 * A single CSV field, quoted only when it needs to be (a comma, quote, or
 * newline is present).
 */
function _csvField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = _toFieldText(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

/**
 * The CSV header line for an explicit, ordered column-name list rather than
 * `Object.keys(rows[0])`, so the header is correct even when the relation has
 * zero rows (and so column order matches the table's own column order, not
 * whatever order the driver happens to return object keys in).
 */
function _makeHeaderLineFromColumnNames(
  columnNames: readonly string[],
): string {
  return columnNames.map(_csvField).join(",");
}

/**
 * The CSV lines for one batch of rows, each starting with the `\r\n` that
 * ends the line before it, so a header and any number of batches join into
 * one document without tracking which batch came first.
 */
function _makeRowLinesFromRows(
  options: Readonly<{
    columnNames: readonly string[];
    rows: ReadonlyArray<Record<string, unknown>>;
  }>,
): string {
  return options.rows
    .map((row) => {
      const fields = options.columnNames.map((columnName) => {
        return _csvField(row[columnName]);
      });
      return `\r\n${fields.join(",")}`;
    })
    .join("");
}

/** Writes a Postgres relation's rows as CSV text, a batch at a time. */
export const PostgresCsv = {
  makeHeaderLineFromColumnNames: _makeHeaderLineFromColumnNames,
  makeRowLinesFromRows: _makeRowLinesFromRows,
};
