import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import { PostgresRelationId } from "$/connectors/postgres/PostgresRelationId/PostgresRelationId.ts";
import type { ConnectorRelation } from "@sbfn/connectors/Connector.ts";
import type { PostgresQueryRunner } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

function _makeRelationFromCatalogRow(row: {
  table_schema: string;
  table_name: string;
  table_type: string;
}): ConnectorRelation {
  const relationId = PostgresRelationId.makeRelationId(
    row.table_schema,
    row.table_name,
  );
  return {
    relationId,
    label: `${row.table_schema}.${row.table_name}`,
    kind: row.table_type === "VIEW" ? "view" : "table",
  };
}

/**
 * Postgres's own catalogs, which `_listCatalogRelations` also leaves out.
 * They describe the server rather than hold anyone's data, so no relation in
 * them can be previewed or read.
 */
const SYSTEM_SCHEMA_NAMES: readonly string[] = [
  "pg_catalog",
  "information_schema",
];

/** Lists every table and view a connection can see, across every schema. */
async function _listCatalogRelations(
  sql: PostgresQueryRunner,
): Promise<ConnectorRelation[]> {
  const rows = await sql<{
    table_schema: string;
    table_name: string;
    table_type: string;
  }>`
    select table_schema, table_name, table_type
    from information_schema.tables
    where table_schema not in ('pg_catalog', 'information_schema')
    order by table_schema, table_name
  `;
  return rows.map(_makeRelationFromCatalogRow);
}

/**
 * Re-checks a schema/table pair against the live catalog. A previously-picked
 * relation is never trusted to still exist - it may have been dropped or
 * renamed since the picker loaded it.
 */
async function _assertRelationStillExists(
  sql: PostgresQueryRunner,
  schemaName: string,
  tableName: string,
): Promise<"table" | "view"> {
  if (SYSTEM_SCHEMA_NAMES.includes(schemaName)) {
    throw new ConnectorError(
      "unknown",
      `'${schemaName}.${tableName}' is part of Postgres's own catalog`,
    );
  }
  const rows = await sql<{ table_type: string }>`
    select table_type
    from information_schema.tables
    where table_schema = ${schemaName} and table_name = ${tableName}
    limit 1
  `;
  const row = rows[0];
  if (!row) {
    throw new ConnectorError(
      "unknown",
      `'${schemaName}.${tableName}' was not found - it may have been dropped or renamed`,
    );
  }
  return row.table_type === "VIEW" ? "view" : "table";
}

/**
 * Parses a relation id built by {@link PostgresRelationId.makeRelationId},
 * throwing a classified `ConnectorError` rather than returning `undefined` -
 * every caller in this edge function already expects a thrown failure, the
 * same shape every other malformed-input case here produces.
 */
function _parseRelationId(relationId: string): {
  schemaName: string;
  tableName: string;
} {
  const split = PostgresRelationId.splitRelationId(relationId);
  if (!split) {
    throw new ConnectorError(
      "unknown",
      `Malformed relationId '${relationId}' - expected 'schema.table'`,
    );
  }
  return split;
}

/** Reads and validates Postgres catalog relations for a saved connection. */
export const PostgresCatalog = {
  listCatalogRelations: _listCatalogRelations,
  assertRelationStillExists: _assertRelationStillExists,
  parseRelationId: _parseRelationId,
};
