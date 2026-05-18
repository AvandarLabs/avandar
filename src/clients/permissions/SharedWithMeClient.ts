import { createServiceClient, withSupabaseClient } from "@clients";
import { withQueryHooks } from "@hooks";
import { withLogger } from "@logger";
import { withNewMembers } from "@modules";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { ILogger } from "@logger";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Database } from "$/types/database.types";

export type ResourceType = Database["public"]["Enums"]["resource_type"];

export type SharedResource = {
  resourceType: ResourceType;
  resourceId: string;
  name: string;
  effectiveRole: RoleLevel;
};

type ListSharedWithMeOptions = {
  workspaceId: WorkspaceId;
};

/**
 * Maps a `rpc__list_shared_with_me` row to the camel-cased UI shape.
 */
function _mapSharedResourceRow(row: {
  resource_type: ResourceType;
  resource_id: string;
  name: string;
  effective_role: RoleLevel;
}): SharedResource {
  return {
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    name: row.name,
    effectiveRole: row.effective_role,
  };
}

/**
 * Read-only client that lists resources the auth user can only reach via
 * direct, group, or workspace-wide `resource_shares` (no parent app role).
 */
function createSharedWithMeClient(supabaseClient: AvaSupabaseDBClient) {
  const baseClient = createServiceClient("SharedWithMeClient").mixin(
    withSupabaseClient(supabaseClient),
  );

  const finalClient = withLogger(baseClient, (baseLogger: ILogger) => {
    const dbClient = baseClient.getDb();
    const newClient = baseClient.mixin(
      withNewMembers({
        /**
         * Lists every dataset and dashboard the auth user can access only via
         * shares (no app role on the parent app) in a workspace.
         */
        listSharedWithMe: async (
          options: ListSharedWithMeOptions,
        ): Promise<SharedResource[]> => {
          const logger = baseLogger.appendName("listSharedWithMe");
          logger.log("fetch shared resources", options);

          const { data, error } = await dbClient.rpc(
            "rpc__list_shared_with_me",
            {
              p_workspace_id: options.workspaceId,
            },
          );

          if (error) {
            throw new Error(error.message);
          }

          return (data ?? []).map(_mapSharedResourceRow);
        },
      }),
    );

    return withQueryHooks(newClient, {
      queryFns: ["listSharedWithMe"],
      mutationFns: [],
    });
  });

  return finalClient;
}

export const SharedWithMeClient = createSharedWithMeClient(AvaSupabase.db());
