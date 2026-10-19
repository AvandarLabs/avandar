import { prop } from "@avandar/utils";
import {
  ConnectorError,
  type ConnectorContext,
  type ConnectorDatasetRelation,
} from "@sbfn/connectors/Connector.ts";
import { PostgresRelationId } from "$/connectors/postgres/PostgresRelationId/PostgresRelationId.ts";

/**
 * Reads, with the service-role client, the saved connection and relation a
 * Postgres-backed dataset reads, and the columns it stores in their stored
 * order.
 *
 * @returns `undefined` when no Postgres-backed dataset has this id.
 */
export async function getPostgresDatasetRelation(
  supabaseAdminClient: ConnectorContext["supabaseAdminClient"],
  datasetId: string,
): Promise<ConnectorDatasetRelation | undefined> {
  const { data: source, error: sourceError } = await supabaseAdminClient
    .from("datasets__postgres_table")
    .select("workspace_id, connection_id, schema_name, table_name")
    .eq("dataset_id", datasetId)
    .maybeSingle();
  if (sourceError) {
    throw new ConnectorError("unknown", sourceError.message);
  }
  if (!source) {
    return undefined;
  }

  const { data: columns, error: columnsError } = await supabaseAdminClient
    .from("dataset_columns")
    .select("original_name")
    .eq("dataset_id", datasetId)
    .eq("workspace_id", source.workspace_id)
    .order("column_idx");
  if (columnsError) {
    throw new ConnectorError("unknown", columnsError.message);
  }

  return {
    workspaceId: source.workspace_id,
    connectionId: source.connection_id,
    relationId: PostgresRelationId.makeRelationId(
      source.schema_name,
      source.table_name,
    ),
    columnNames: columns.map(prop("original_name")),
  };
}
