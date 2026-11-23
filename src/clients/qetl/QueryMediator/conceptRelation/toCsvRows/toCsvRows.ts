function _quoteCsvField(value: string): string {
  // The empty case is quoted deliberately, and it is not cosmetic. An empty
  // field written bare in a one-column file produces a line with no
  // characters, which DuckDB reads as a blank line and skips, so an empty
  // `external_id` would silently drop an individual and change the relation's
  // grain. `""` is unambiguous. Caught by the round-trip test rather than by
  // inspection, which is why that test reads the values back through a real
  // CSV parser instead of asserting the text.
  const needsQuoting =
    value === "" ||
    value.includes('"') ||
    value.includes(",") ||
    value.includes("\n") ||
    value.includes("\r");
  return needsQuoting ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * Renders rows of values, under a header row, as RFC 4180 CSV text.
 *
 * This exists so a concept's spine can reach DuckDB without any user data
 * entering a SQL string. `external_id` and status names are user-supplied, and
 * interpolating them into SQL would be an injection surface. Loading the spine
 * as a registered CSV file avoids one, which is why this is a CSV writer
 * rather than a `VALUES` builder.
 *
 * RFC 4180 quoting and nothing more: double every `"`, and wrap a field in
 * quotes when it is empty or contains a quote, a comma, a carriage return or a
 * newline. Header names are quoted by the same rule.
 */
export function toCsvRows(
  options: Readonly<{
    columnNames: readonly string[];
    rows: ReadonlyArray<readonly string[]>;
  }>,
): string {
  return [options.columnNames, ...options.rows]
    .map((fields) => {
      return fields.map(_quoteCsvField).join(",");
    })
    .join("\n");
}
