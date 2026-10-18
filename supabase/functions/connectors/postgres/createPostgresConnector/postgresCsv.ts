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
 * Builds CSV text from an explicit, ordered column-name list rather than
 * `Object.keys(rows[0])`, so the header is correct even when the relation has
 * zero rows (and so column order matches the table's own column order, not
 * whatever order the driver happens to return object keys in).
 */
export function rowsToCsv(
  columnNames: string[],
  rows: Array<Record<string, unknown>>,
): string {
  const header = columnNames.map(_csvField).join(",");
  const lines = rows.map((row) => {
    return columnNames
      .map((columnName) => {
        return _csvField(row[columnName]);
      })
      .join(",");
  });
  return [header, ...lines].join("\r\n");
}
