import { createServiceClient, withSupabaseClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withNewMembers } from "@avandar/modules";
import { withQueryHooks } from "@avandar/query-hooks";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { ILogger } from "@avandar/logger";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/** Per-member counts of resources private to that member. */
export type PrivateResourceCount = {
  userId: string;
  privateDashboardCount: number;
  privateDatasetCount: number;
};

type ClientDependencies = {
  dbClient: AvaSupabaseDBClient;
  baseLogger: ILogger;
};

function _createGetPrivateResourceCounts({
  dbClient,
  baseLogger,
}: Readonly<ClientDependencies>) {
  return async (
    options: Readonly<{ workspaceId: Workspace.Id }>,
  ): Promise<PrivateResourceCount[]> => {
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
  };
}

function _createTransferResourceOwnership({
  dbClient,
  baseLogger,
}: Readonly<ClientDependencies>) {
  return async (
    options: Readonly<{
      resourceType: ResourceType;
      resourceId: string;
      newOwnerId: string;
    }>,
  ): Promise<void> => {
    const logger = baseLogger.appendName("transferResourceOwnership");
    logger.log("transfer resource ownership", options);

    const { error } = await dbClient.rpc("rpc_resources__transfer_ownership", {
      p_resource_type: options.resourceType,
      p_resource_id: options.resourceId,
      p_new_owner_id: options.newOwnerId,
    });
    if (error) {
      throw new Error(error.message);
    }
  };
}

function _createTransferAllOwnedResources({
  dbClient,
  baseLogger,
}: Readonly<ClientDependencies>) {
  return async (
    options: Readonly<{
      workspaceId: Workspace.Id;
      fromUserId: string;
      newOwnerId: string;
    }>,
  ): Promise<number> => {
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
  };
}

function _createPrivateResourceAdminClient(
  supabaseClient: AvaSupabaseDBClient,
) {
  const baseClient = createServiceClient("PrivateResourceAdminClient").mixin(
    withSupabaseClient(supabaseClient),
  );

  return withLogger(baseClient, (baseLogger: ILogger) => {
    const dependencies = { dbClient: baseClient.getDb(), baseLogger };
    const client = baseClient.mixin(
      withNewMembers({
        /** Loads per-member private-resource counts for a workspace. */
        getPrivateResourceCounts: _createGetPrivateResourceCounts(dependencies),

        /** Reassigns one resource without granting the caller read access. */
        transferResourceOwnership:
          _createTransferResourceOwnership(dependencies),

        /** Moves all resources owned by one workspace member. */
        transferAllOwnedResources:
          _createTransferAllOwnedResources(dependencies),
      }),
    );

    return withQueryHooks(client, {
      queryFns: ["getPrivateResourceCounts"],
      mutationFns: ["transferResourceOwnership", "transferAllOwnedResources"],
    });
  });
}

/** Admin operations that expose no owner-private resource content. */
export const PrivateResourceAdminClient = _createPrivateResourceAdminClient(
  AvaSupabase.db(),
);
