import { quoteSqlIdentifier } from "@avandar/utils/sql";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/**
 * Builds the `"schema"."table"` fragment a query interpolates to reference
 * one relation, with each name always quoted as its own identifier.
 *
 * Not the driver's `sql(name)` helper: postgres.js also rewrites every `.`
 * inside a name to `"."` (so `sql("schema.table")` can address a qualified
 * table), which splits a single name that legitimately contains a dot, such
 * as a table called `orders.2024`, into two identifiers. This quotes names
 * the way postgres.js itself does for `listen`/`unlisten` channel names.
 */
export function quotePostgresRelationName(
  options: Readonly<{
    sql: PostgresSql;
    schemaName: string;
    tableName: string;
  }>,
): unknown {
  return options.sql.unsafe(
    `${quoteSqlIdentifier(options.schemaName)}.${quoteSqlIdentifier(options.tableName)}`,
  );
}
