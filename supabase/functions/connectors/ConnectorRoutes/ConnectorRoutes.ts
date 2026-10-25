import { assertMaySelectDataset } from "@sbfn/_shared/assertMaySelectDataset/assertMaySelectDataset.ts";
import { assertMeetsMinAppRole } from "@sbfn/_shared/assertMeetsMinAppRole.ts";
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { FORBIDDEN } from "@sbfn/_shared/httpCodes.ts";
import {
  defineRoutes,
  GET,
  POST,
} from "@sbfn/_shared/MiniServer/MiniServer.ts";
import {
  ConnectorError,
  type ConnectorContext,
} from "@sbfn/connectors/Connector.ts";
import { getConnector } from "@sbfn/connectors/connectorRegistry.ts";
import { object, string } from "zod";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type {
  ConnectorErrorResponse,
  ConnectorsApi,
} from "@sbfn/connectors/ConnectorRoutes/ConnectorRoutes.types.ts";

/**
 * `{ workspaceId, connectionId?, ...connectorFields }` - every connector
 * type's route body carries this shared shape; connector-specific fields are
 * validated by the connector itself.
 */
const testAndSaveBodySchema = object({
  workspaceId: string(),
  connectionId: string().optional(),
}).passthrough();

/**
 * Looks up the workspace a saved connection belongs to, through the
 * **user-scoped** client so `connections`'s own RLS (`'editor'`+ on
 * `data_sources`) is what actually gates this - there is no separate
 * app-role check to duplicate here, because the lookup itself already fails
 * for anyone without sufficient access. Never distinguishes "doesn't exist"
 * from "no permission" in its error - both look identical to the caller.
 */
async function _getOwningWorkspaceId(
  supabaseClient: AvaSupabaseClient,
  connectionId: string,
): Promise<string> {
  const { data, error } = await supabaseClient
    .from("connections")
    .select("workspace_id")
    .eq("id", connectionId)
    .maybeSingle();

  if (error || !data) {
    throw new AvaHTTPError(`No connection '${connectionId}' found`, FORBIDDEN);
  }
  return data.workspace_id;
}

/**
 * Converts a connector failure into the route table's closed error shape
 * (`{ error: { code, message } }`). Returned as a plain object, not a
 * `Response` with its own status code - MiniServer wraps any non-`Response`
 * return in a 200 via `responseSuccess` either way, so the domain-specific
 * failure lives entirely in the body's own `error` field, not the transport
 * status. An error this function does not recognize (anything but
 * `ConnectorError`) is rethrown so MiniServer's own catch-all still
 * produces a real 500, instead of this masking a genuine bug as a tidy
 * `{error: {...}}` response.
 */
function _toErrorResult(error: unknown): ConnectorErrorResponse {
  if (error instanceof ConnectorError) {
    return { error: { code: error.code, message: error.message } };
  }
  throw error;
}

/**
 * Resolves the connector and per-request context shared by every route that
 * acts on an already-saved connection (`relations`, `preview`):
 * looks up the connector by type, derives the owning workspace from the
 * connection itself, and assembles the context object every connector method
 * takes. `test-and-save` does not use this - it may not have a
 * `connectionId` yet, so its workspace resolution branches differently.
 */
async function _buildConnectorContext(
  pathParams: { connectorType: string; connectionId: string },
  supabaseClient: AvaSupabaseClient,
  supabaseAdminClient: ConnectorContext["supabaseAdminClient"],
): Promise<{
  connector: ReturnType<typeof getConnector>;
  context: ConnectorContext;
}> {
  const connector = getConnector(pathParams.connectorType);
  const workspaceId = await _getOwningWorkspaceId(
    supabaseClient,
    pathParams.connectionId,
  );
  return {
    connector,
    context: { workspaceId, supabaseClient, supabaseAdminClient },
  };
}

/**
 * The `connectors` proxy's route table: test-and-save a connection, list
 * its relations and preview one, and read a dataset's rows as CSV - all
 * dispatched through {@link getConnector} to the connector type named in
 * the path.
 *
 * The connection routes are for whoever manages connections, and the
 * connections table's own policies gate them. The dataset rows route is for
 * anyone who can see the dataset: it reads through the credential the
 * dataset was imported with, which the caller never sees.
 */
export const ConnectorRoutes = defineRoutes<ConnectorsApi>("connectors", {
  "/:connectorType/connections/test-and-save": {
    POST: POST({
      path: "/:connectorType/connections/test-and-save",
      schema: { connectorType: string() },
    })
      .bodySchema(testAndSaveBodySchema)
      .action(
        async ({ pathParams, body, supabaseClient, supabaseAdminClient }) => {
          const connector = getConnector(pathParams.connectorType);

          const workspaceId = body.connectionId
            ? await _getOwningWorkspaceId(supabaseClient, body.connectionId)
            : body.workspaceId;

          // Authoritative pattern for this gate, not one of several options:
          // `assertMeetsMinAppRole` is the first and only edge-function
          // caller of `util__auth_user_meets_min_app_role` in this codebase.
          // A future route that needs an app-role check before touching
          // `supabaseAdminClient` should call it exactly this way - only on
          // the branch with no existing row to derive access from, before any
          // service-role work begins. See `assertMeetsMinAppRole.ts`'s own
          // docstring for the full reasoning.
          if (!body.connectionId) {
            await assertMeetsMinAppRole({
              supabaseClient,
              workspaceId,
              app: "data_sources",
              minRole: "editor",
            });
          }

          const context: ConnectorContext = {
            workspaceId,
            supabaseClient,
            supabaseAdminClient,
          };

          try {
            return await connector.testAndSaveConnection(context, body);
          } catch (error) {
            return _toErrorResult(error);
          }
        },
      ),
  },
  "/:connectorType/connections/:connectionId/relations": {
    GET: GET({
      path: "/:connectorType/connections/:connectionId/relations",
      schema: { connectorType: string(), connectionId: string() },
    }).action(async ({ pathParams, supabaseClient, supabaseAdminClient }) => {
      const { connector, context } = await _buildConnectorContext(
        pathParams,
        supabaseClient,
        supabaseAdminClient,
      );

      try {
        const relations = await connector.listRelations(
          context,
          pathParams.connectionId,
        );
        return { relations };
      } catch (error) {
        return _toErrorResult(error);
      }
    }),
  },
  "/:connectorType/connections/:connectionId/relations/:relationId/preview": {
    GET: GET({
      path: "/:connectorType/connections/:connectionId/relations/:relationId/preview",
      schema: {
        connectorType: string(),
        connectionId: string(),
        relationId: string(),
      },
    }).action(async ({ pathParams, supabaseClient, supabaseAdminClient }) => {
      const { connector, context } = await _buildConnectorContext(
        pathParams,
        supabaseClient,
        supabaseAdminClient,
      );

      try {
        return await connector.previewRelation(
          context,
          pathParams.connectionId,
          decodeURIComponent(pathParams.relationId),
        );
      } catch (error) {
        return _toErrorResult(error);
      }
    }),
  },
  "/:connectorType/datasets/:datasetId/rows": {
    GET: GET({
      path: "/:connectorType/datasets/:datasetId/rows",
      schema: { connectorType: string(), datasetId: string() },
    }).action(async ({ pathParams, supabaseClient, supabaseAdminClient }) => {
      const connector = getConnector(pathParams.connectorType);
      await assertMaySelectDataset({
        supabaseClient,
        datasetId: pathParams.datasetId,
      });
      const relation = await connector.getDatasetRelation({
        supabaseAdminClient,
        datasetId: pathParams.datasetId,
      });
      if (!relation) {
        throw new AvaHTTPError(
          `No dataset '${pathParams.datasetId}' found`,
          FORBIDDEN,
        );
      }
      const context: ConnectorContext = {
        workspaceId: relation.workspaceId,
        supabaseClient,
        supabaseAdminClient,
      };

      try {
        const csvBytes = await connector.getRelationRows(context, relation);
        return new Response(csvBytes, {
          headers: { ...corsHeaders, "Content-Type": "text/csv" },
        });
      } catch (error) {
        return _toErrorResult(error);
      }
    }),
  },
});
