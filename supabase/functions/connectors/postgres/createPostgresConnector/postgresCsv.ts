/**
 * A single CSV field, quoted only when it needs to be (a comma, quote, or
 * newline is present).
 */
function csvField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
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
  const header = columnNames.map(csvField).join(",");
  const lines = rows.map((row) => {
    return columnNames
      .map((columnName) => {
        return csvField(row[columnName]);
      })
      .join(",");
  });
  return [header, ...lines].join("\r\n");
}
