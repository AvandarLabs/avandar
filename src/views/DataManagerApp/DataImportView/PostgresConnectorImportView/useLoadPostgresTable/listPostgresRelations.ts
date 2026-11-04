import { APIClient } from "@/clients/APIClient";
import type { DatabaseConnection } from "$/models/connections/DatabaseConnection/DatabaseConnection";
import type { ConnectorRelation } from "@sbfn/connectors/Connector";

/**
 * Fetches a saved connection's table/view catalog from the `connectors`
 * proxy.
 */
export async function listPostgresRelations(
  connectionId: DatabaseConnection.Id,
): Promise<ConnectorRelation[]> {
  const result = await APIClient.get({
    route: "connectors/:connectorType/connections/:connectionId/relations",
    pathParams: {
      connectorType: "postgres",
      connectionId,
    },
  });
  if ("error" in result) {
    throw Object.assign(new Error(result.error.message), {
      code: result.error.code,
    });
  }
  return result.relations;
}
