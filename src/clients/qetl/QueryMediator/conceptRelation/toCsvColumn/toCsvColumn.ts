/**
 * Renders one column of values as RFC 4180 CSV text.
 *
 * This exists so a concept's spine can reach DuckDB without any user data
 * entering a SQL string. `external_id` is user-supplied, and the one place the
 * codebase interpolates it into SQL today
 * (`AttributeAssertionClient`, `WHERE "<pk>" = '<externalId>'`) is an injection
 * surface. Loading the spine as a registered CSV file avoids adding a second
 * one, which is why this is a CSV writer rather than a `VALUES` builder.
 *
 * RFC 4180 quoting and nothing more: double every `"`, and wrap a field in
 * quotes when it contains a quote, a comma, a carriage return or a newline.
 */
export function toCsvColumn(
  columnName: string,
  values: readonly string[],
): string {
  return [columnName, ...values.map(_quoteCsvField)].join("\n");
}

function _quoteCsvField(value: string): string {
  // The empty case is quoted deliberately, and it is not cosmetic. An empty
  // field written bare produces a line with no characters, which DuckDB reads
  // as a blank line and skips, so an empty `external_id` would silently drop an
  // individual and change the relation's grain. `""` is unambiguous. Caught by
  // the round-trip test rather than by inspection, which is why that test reads
  // the values back through a real CSV parser instead of asserting the text.
  const needsQuoting =
    value === "" ||
    value.includes('"') ||
    value.includes(",") ||
    value.includes("\n") ||
    value.includes("\r");
  return needsQuoting ? `"${value.replaceAll('"', '""')}"` : value;
}
