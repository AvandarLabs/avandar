import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/**
 * Quotes one identifier the same way Postgres's own `quote_ident()` does:
 * wrapped in double quotes, with every embedded double quote doubled. That
 * is the whole escaping rule for a quoted identifier, so no name can close
 * its own quoting.
 */
function _quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

/**
 * Builds the `"schema"."table"` fragment a query interpolates to reference
 * one relation, with each name quoted as its own identifier.
 *
 * Not the driver's `sql(name)` helper: postgres.js also rewrites every `.`
 * inside a name to `"."` (so `sql("schema.table")` can address a qualified
 * table), which splits a single name that legitimately contains a dot, such
 * as a table called `orders.2024`, into two identifiers. This quotes names
 * the way postgres.js itself does for `listen`/`notify` channel names.
 */
export function quotePostgresRelationName(
  sql: PostgresSql,
  schemaName: string,
  tableName: string,
): unknown {
  return sql.unsafe(
    `${_quoteIdentifier(schemaName)}.${_quoteIdentifier(tableName)}`,
  );
}
