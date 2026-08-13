import { createServiceClient, withSupabaseClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withNewMembers } from "@avandar/modules";
import { withQueryHooks } from "@avandar/query-hooks";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { ILogger } from "@avandar/logger";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/**
 * Per-member count of resources private to that member. Counts only: workspace
 * admins are deliberately unable to see the resources themselves.
 */
export type PrivateResourceCount = {
  userId: string;
  privateDashboardCount: number;
  privateDatasetCount: number;
};

/**
 * Admin-only operations on resources that RLS hides from workspace admins.
 * Both calls are security-definer RPCs; neither returns private content.
 */
function createPrivateResourceAdminClient(supabaseClient: AvaSupabaseDBClient) {
  const baseClient = createServiceClient("PrivateResourceAdminClient").mixin(
    withSupabaseClient(supabaseClient),
  );

  const finalClient = withLogger(baseClient, (baseLogger: ILogger) => {
    const dbClient = baseClient.getDb();
    const newClient = baseClient.mixin(
      withNewMembers({
        /**
         * Loads per-member private-resource counts for a workspace. Throws when
         * the caller is not a workspace manager.
         */
        getPrivateResourceCounts: async (options: {
          workspaceId: WorkspaceId;
        }): Promise<PrivateResourceCount[]> => {
          const logger = baseLogger.appendName("getPrivateResourceCounts");
          logger.log("fetch private resource counts", options);

          const { data, error } = await dbClient.rpc(
            "rpc_workspaces__private_resource_counts",
            { p_workspace_id: options.workspaceId },
          );

          if (error) {
            throw new Error(error.message);
          }

          return (data ?? []).map((row) => {
            return {
              userId: row.user_id,
              privateDashboardCount: row.private_dashboard_count,
              privateDatasetCount: row.private_dataset_count,
            };
          });
        },

        /**
         * Reassigns a resource's owner. Grants the caller no read access to the
         * resource; the RPC writes an audit row.
         */
        transferResourceOwnership: async (options: {
          resourceType: ResourceType;
          resourceId: string;
          newOwnerId: string;
        }): Promise<void> => {
          const logger = baseLogger.appendName("transferResourceOwnership");
          logger.log("transfer resource ownership", options);

          const { error } = await dbClient.rpc(
            "rpc_resources__transfer_ownership",
            {
              p_resource_type: options.resourceType,
              p_resource_id: options.resourceId,
              p_new_owner_id: options.newOwnerId,
            },
          );

          if (error) {
            throw new Error(error.message);
          }
        },

        /**
         * Moves every resource a member owns in this workspace to a new owner.
         *
         * This is what the reassign UI calls. A per-resource picker is
         * impossible to build for an admin, who cannot see which private
         * resources exist, so offboarding transfers by owner instead.
         *
         * @returns The number of resources moved.
         */
        transferAllOwnedResources: async (options: {
          workspaceId: WorkspaceId;
          fromUserId: string;
          newOwnerId: string;
        }): Promise<number> => {
          const logger = baseLogger.appendName("transferAllOwnedResources");
          logger.log("transfer all owned resources", options);

          const { data, error } = await dbClient.rpc(
            "rpc_workspaces__transfer_all_owned_resources",
            {
              p_workspace_id: options.workspaceId,
              p_from_user_id: options.fromUserId,
              p_new_owner_id: options.newOwnerId,
            },
          );

          if (error) {
            throw new Error(error.message);
          }

          return data ?? 0;
        },
      }),
    );

    return withQueryHooks(newClient, {
      queryFns: ["getPrivateResourceCounts"],
      mutationFns: ["transferResourceOwnership", "transferAllOwnedResources"],
    });
  });

  return finalClient;
}

export const PrivateResourceAdminClient = createPrivateResourceAdminClient(
  AvaSupabase.db(),
);
