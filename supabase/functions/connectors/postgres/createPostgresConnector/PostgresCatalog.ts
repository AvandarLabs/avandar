import {
  ConnectorError,
  type ConnectorPreviewColumn,
  type ConnectorRelation,
} from "@sbfn/connectors/Connector.ts";
import { getAvaDataTypeFromPostgresDataType } from "$/connectors/postgres/getAvaDataTypeFromPostgresDataType/getAvaDataTypeFromPostgresDataType.ts";
import { PostgresRelationId } from "$/connectors/postgres/PostgresRelationId/PostgresRelationId.ts";
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
  // Postgres's own catalogs, which `_listCatalogRelations` also leaves out,
  // describe the server rather than hold anyone's data, so no relation in
  // them can be previewed or read.
  if (["pg_catalog", "information_schema"].includes(schemaName)) {
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

async function _readColumnTypes(
  options: Readonly<{
    sql: PostgresQueryRunner;
    schemaName: string;
    tableName: string;
  }>,
): Promise<ConnectorPreviewColumn[]> {
  const { sql, schemaName, tableName } = options;
  const columns = await sql<{ column_name: string; data_type: string }>`
    select column_name, data_type
    from information_schema.columns
    where table_schema = ${schemaName} and table_name = ${tableName}
    order by ordinal_position
  `;
  return columns.map((column) => {
    return {
      columnName: column.column_name,
      sourceType: column.data_type,
      dataType: getAvaDataTypeFromPostgresDataType(column.data_type),
    };
  });
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

  /**
   * Reads a relation's columns, in table order, with the type each is
   * queried as, from the type its table declares in `information_schema`.
   * This is how the Postgres connector extracts column types: from the
   * schema, so nothing has to guess them from the values.
   */
  readColumnTypes: _readColumnTypes,

  parseRelationId: _parseRelationId,
};
