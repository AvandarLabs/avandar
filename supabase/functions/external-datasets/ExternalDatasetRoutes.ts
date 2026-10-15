import { assertMeetsMinAppRole } from "@sbfn/_shared/assertMeetsMinAppRole.ts";
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { FORBIDDEN } from "@sbfn/_shared/httpCodes.ts";
import { defineRoutes, GET, POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { getConnector } from "@sbfn/external-datasets/connectorRegistry.ts";
import {
  ExternalDatasetError,
  type ExternalDatasetConnectorContext,
} from "@sbfn/external-datasets/connectors/ExternalDatasetConnector.ts";
import { object, string } from "zod";
import type { ExternalDatasetErrorResponse } from "@sbfn/external-datasets/ExternalDatasetRoutes.types.ts";
import type { ExternalDatasetsAPI } from "@sbfn/external-datasets/ExternalDatasetRoutes.types.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/** `{ workspaceId, connectionId?, ...connectorFields }` - spec section 5.4's route table. Connector-specific fields are validated by the connector itself. */
const testAndSaveBodySchema = object({
  workspaceId: string(),
  connectionId: string().optional(),
}).passthrough();

/**
 * Looks up the workspace a saved connection belongs to, through the
 * **user-scoped** client so `db_connections`'s own RLS (`'editor'`+ on
 * `data_sources`, per spec section 5.1) is what actually gates this -
 * there is no separate app-role check to duplicate here, because the
 * lookup itself already fails for anyone without sufficient access.
 * Never distinguishes "doesn't exist" from "no permission" in its error -
 * both look identical to the caller.
 */
async function _getOwningWorkspaceId(
  supabaseClient: AvaSupabaseClient,
  connectionId: string,
): Promise<string> {
  const { data, error } = await supabaseClient
    .from("db_connections")
    .select("workspace_id")
    .eq("id", connectionId)
    .maybeSingle();

  if (error || !data) {
    throw new AvaHTTPError(
      `No connection '${connectionId}' found`,
      FORBIDDEN,
    );
  }
  return data.workspace_id;
}

/**
 * Converts a connector failure into the route table's closed error shape
 * (spec section 5.4: `{ error: { code, message } }`). Returned as a plain
 * object, not a `Response` with its own status code - MiniServer wraps any
 * non-`Response` return in a 200 via `responseSuccess` either way, so the
 * domain-specific failure lives entirely in the body's own `error` field,
 * not the transport status. An error this function does not recognize
 * (anything but `ExternalDatasetError`) is rethrown so MiniServer's own
 * catch-all still produces a real 500, instead of this masking a genuine
 * bug as a tidy `{error: {...}}` response.
 */
function _toErrorResult(error: unknown): ExternalDatasetErrorResponse {
  if (error instanceof ExternalDatasetError) {
    return { error: { code: error.code, message: error.message } };
  }
  throw error;
}

export const ExternalDatasetRoutes = defineRoutes<ExternalDatasetsAPI>(
  "external-datasets",
  {
    "/:connectorType/connections/test-and-save": {
      POST: POST({
        path: "/:connectorType/connections/test-and-save",
        schema: { connectorType: string() },
      })
        .bodySchema(testAndSaveBodySchema)
        .action(async ({ pathParams, body, supabaseClient, supabaseAdminClient }) => {
          const connector = getConnector(pathParams.connectorType);

          const workspaceId = body.connectionId
            ? await _getOwningWorkspaceId(supabaseClient, body.connectionId)
            : body.workspaceId;

          if (!body.connectionId) {
            await assertMeetsMinAppRole({
              supabaseClient,
              workspaceId,
              app: "data_sources",
              minRole: "editor",
            });
          }

          const context: ExternalDatasetConnectorContext = {
            workspaceId,
            supabaseClient,
            supabaseAdminClient,
          };

          try {
            return await connector.testAndSaveConnection(context, body);
          } catch (error) {
            return _toErrorResult(error);
          }
        }),
    },
    "/:connectorType/connections/:connectionId/relations": {
      GET: GET({
        path: "/:connectorType/connections/:connectionId/relations",
        schema: { connectorType: string(), connectionId: string() },
      }).action(
        async ({ pathParams, supabaseClient, supabaseAdminClient }) => {
          const connector = getConnector(pathParams.connectorType);
          const workspaceId = await _getOwningWorkspaceId(
            supabaseClient,
            pathParams.connectionId,
          );
          const context: ExternalDatasetConnectorContext = {
            workspaceId,
            supabaseClient,
            supabaseAdminClient,
          };

          try {
            const relations = await connector.listRelations(
              context,
              pathParams.connectionId,
            );
            return { relations };
          } catch (error) {
            return _toErrorResult(error);
          }
        },
      ),
    },
    "/:connectorType/connections/:connectionId/relations/:relationId/preview":
      {
        GET: GET({
          path: "/:connectorType/connections/:connectionId/relations/:relationId/preview",
          schema: {
            connectorType: string(),
            connectionId: string(),
            relationId: string(),
          },
        }).action(
          async ({ pathParams, supabaseClient, supabaseAdminClient }) => {
            const connector = getConnector(pathParams.connectorType);
            const workspaceId = await _getOwningWorkspaceId(
              supabaseClient,
              pathParams.connectionId,
            );
            const context: ExternalDatasetConnectorContext = {
              workspaceId,
              supabaseClient,
              supabaseAdminClient,
            };

            try {
              return await connector.previewRelation(
                context,
                pathParams.connectionId,
                decodeURIComponent(pathParams.relationId),
              );
            } catch (error) {
              return _toErrorResult(error);
            }
          },
        ),
      },
    "/:connectorType/connections/:connectionId/relations/:relationId/rows": {
      GET: GET({
        path: "/:connectorType/connections/:connectionId/relations/:relationId/rows",
        schema: {
          connectorType: string(),
          connectionId: string(),
          relationId: string(),
        },
      }).action(
        async ({ pathParams, supabaseClient, supabaseAdminClient }) => {
          const connector = getConnector(pathParams.connectorType);
          const workspaceId = await _getOwningWorkspaceId(
            supabaseClient,
            pathParams.connectionId,
          );
          const context: ExternalDatasetConnectorContext = {
            workspaceId,
            supabaseClient,
            supabaseAdminClient,
          };

          try {
            const csv = await connector.getRelationRows(
              context,
              pathParams.connectionId,
              decodeURIComponent(pathParams.relationId),
            );
            return new Response(csv, {
              headers: { ...corsHeaders, "Content-Type": "text/csv" },
            });
          } catch (error) {
            return _toErrorResult(error);
          }
        },
      ),
    },
  },
);
