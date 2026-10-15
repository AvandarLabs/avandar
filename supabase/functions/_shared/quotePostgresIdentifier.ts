/**
 * Quotes a single Postgres identifier (a schema or table/view name) the same
 * way `quote_ident()`/`%I` do: wrap in double quotes, double any embedded
 * double quote, and reject a NUL byte (Postgres never allows one in an
 * identifier, so refusing it here is correct, not a gap).
 *
 * This is a validation/display helper - the actual queries this connector
 * runs build their identifiers through the Postgres driver's own tagged
 * template (`sql(name)`), per spec section 5.2 item 5. Never build a SQL
 * string by concatenating this function's output into a query yourself.
 *
 * Quoting unconditionally (rather than only when the name needs it) means
 * there is exactly one code path to get right, and a crafted name cannot
 * break out of the identifier: once wrapped in double quotes, a line comment
 * (`--`), a block comment (`/*`), a statement terminator (`;`), or a
 * reserved keyword are all just literal characters inside the quoted
 * token - none of them is special to Postgres's parser there.
 */
export function quotePostgresIdentifier(identifier: string): string {
  if (identifier.includes("\0")) {
    throw new Error("Identifier must not contain a NUL byte");
  }
  if (identifier.length === 0) {
    throw new Error("Identifier must not be empty");
  }

  const escaped = identifier.replaceAll('"', '""');
  return `"${escaped}"`;
}

/**
 * Quotes a schema-qualified identifier (`schema.table`) as two separately
 * quoted, dot-joined identifiers - never a single quoted string spanning
 * both, since that would quote the literal text `schema.table` as one name
 * rather than referencing the table inside the schema.
 */
export function quoteQualifiedPostgresIdentifier(
  schemaName: string,
  tableName: string,
): string {
  return `${quotePostgresIdentifier(schemaName)}.${quotePostgresIdentifier(tableName)}`;
}
