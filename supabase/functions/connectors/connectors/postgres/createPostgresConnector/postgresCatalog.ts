import { ExternalDatasetError } from "@sbfn/connectors/connectors/ExternalDatasetConnector.ts";
import type { ExternalDatasetRelation } from "@sbfn/connectors/connectors/ExternalDatasetConnector.ts";
import type { PostgresSql } from "@sbfn/connectors/connectors/postgres/PostgresSql.types.ts";

function makeRelationFromCatalogRow(row: {
  table_schema: string;
  table_name: string;
  table_type: string;
}): ExternalDatasetRelation {
  const relationId = `${row.table_schema}.${row.table_name}`;
  return {
    relationId,
    label: relationId,
    kind: row.table_type === "VIEW" ? "view" : "table",
  };
}

/** Lists every table and view a connection can see, across every schema. */
export async function listCatalogRelations(
  sql: PostgresSql,
): Promise<ExternalDatasetRelation[]> {
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
  return rows.map(makeRelationFromCatalogRow);
}

/**
 * Re-checks a schema/table pair against the live catalog. A previously-picked
 * relation is never trusted to still exist - it may have been dropped or
 * renamed since the picker loaded it.
 */
export async function assertRelationStillExists(
  sql: PostgresSql,
  schemaName: string,
  tableName: string,
): Promise<"table" | "view"> {
  const rows = await sql<{ table_type: string }>`
    select table_type
    from information_schema.tables
    where table_schema = ${schemaName} and table_name = ${tableName}
    limit 1
  `;
  const row = rows[0];
  if (!row) {
    throw new ExternalDatasetError(
      "unknown",
      `'${schemaName}.${tableName}' was not found - it may have been dropped or renamed`,
    );
  }
  return row.table_type === "VIEW" ? "view" : "table";
}

export function parseRelationId(relationId: string): {
  schemaName: string;
  tableName: string;
} {
  const separatorIndex = relationId.indexOf(".");
  if (separatorIndex === -1) {
    throw new ExternalDatasetError(
      "unknown",
      `Malformed relationId '${relationId}' - expected 'schema.table'`,
    );
  }
  return {
    schemaName: relationId.slice(0, separatorIndex),
    tableName: relationId.slice(separatorIndex + 1),
  };
}
