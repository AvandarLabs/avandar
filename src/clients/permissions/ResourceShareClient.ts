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

export type SharePrincipalType =
  Database["public"]["Enums"]["share_principal_type"];

export type ResourceShareRow = {
  id: string;
  workspaceId: WorkspaceId;
  resourceType: ResourceType;
  resourceId: string;
  principalType: SharePrincipalType;
  principalId: string | null;
  role: RoleLevel;
};

export type ResourceSharingState = {
  isRestricted: boolean;
  shares: readonly ResourceShareRow[];
  resourceTagIds: readonly string[];
};

function _mapResourceShareRow(row: {
  id: string;
  workspace_id: string;
  resource_type: ResourceType;
  resource_id: string;
  principal_type: SharePrincipalType;
  principal_id: string | null;
  role: RoleLevel;
}): ResourceShareRow {
  return {
    id: row.id,
    workspaceId: row.workspace_id as WorkspaceId,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    principalType: row.principal_type,
    principalId: row.principal_id,
    role: row.role,
  };
}

/**
 * CRUD for `resource_shares`, resource tags, and `is_restricted` on resources.
 */
function createResourceShareClient(supabaseClient: AvaSupabaseDBClient) {
  const baseClient = createServiceClient("ResourceShareClient").mixin(
    withSupabaseClient(supabaseClient),
  );

  const finalClient = withLogger(baseClient, (baseLogger: ILogger) => {
    const dbClient = baseClient.getDb();
    const newClient = baseClient.mixin(
      withNewMembers({
        /**
         * Loads shares, tag ids, and restriction flag for one resource.
         */
        getResourceSharingState: async (options: {
          workspaceId: WorkspaceId;
          resourceType: ResourceType;
          resourceId: string;
        }): Promise<ResourceSharingState> => {
          const logger = baseLogger.appendName("getResourceSharingState");
          logger.log("fetch sharing state", options);

          const resourceTable =
            options.resourceType === "dashboard" ? "dashboards" : "datasets";

          const [
            { data: resourceRow },
            { data: shareRows },
            { data: tagRows },
          ] = await Promise.all([
            dbClient
              .from(resourceTable)
              .select("is_restricted")
              .eq("id", options.resourceId)
              .eq("workspace_id", options.workspaceId)
              .single()
              .throwOnError(),
            dbClient
              .from("resource_shares")
              .select(
                `
                  id,
                  workspace_id,
                  resource_type,
                  resource_id,
                  principal_type,
                  principal_id,
                  role
                `,
              )
              .eq("workspace_id", options.workspaceId)
              .eq("resource_type", options.resourceType)
              .eq("resource_id", options.resourceId)
              .throwOnError(),
            dbClient
              .from("resource_user_group_tags")
              .select("user_group_id")
              .eq("workspace_id", options.workspaceId)
              .eq("resource_type", options.resourceType)
              .eq("resource_id", options.resourceId)
              .throwOnError(),
          ]);

          return {
            isRestricted: resourceRow.is_restricted,
            shares: (shareRows ?? []).map(_mapResourceShareRow),
            resourceTagIds: (tagRows ?? []).map((row) => {
              return row.user_group_id;
            }),
          };
        },

        /**
         * Upserts one share row (user, user_group, or workspace principal).
         */
        upsertResourceShare: async (options: {
          workspaceId: WorkspaceId;
          resourceType: ResourceType;
          resourceId: string;
          principalType: SharePrincipalType;
          principalId: string | null;
          role: RoleLevel;
        }): Promise<ResourceShareRow> => {
          const logger = baseLogger.appendName("upsertResourceShare");
          logger.log("upsert share", options);

          let existingQuery = dbClient
            .from("resource_shares")
            .select("id")
            .eq("workspace_id", options.workspaceId)
            .eq("resource_type", options.resourceType)
            .eq("resource_id", options.resourceId)
            .eq("principal_type", options.principalType);

          if (options.principalType === "workspace") {
            existingQuery = existingQuery.is("principal_id", null);
          } else {
            existingQuery = existingQuery.eq(
              "principal_id",
              options.principalId!,
            );
          }

          const { data: existing } = await existingQuery
            .maybeSingle()
            .throwOnError();

          if (options.principalType === "workspace") {
            if (existing?.id) {
              const { data } = await dbClient
                .from("resource_shares")
                .update({ role: options.role })
                .eq("id", existing.id)
                .select(
                  `
                  id,
                  workspace_id,
                  resource_type,
                  resource_id,
                  principal_type,
                  principal_id,
                  role
                `,
                )
                .single()
                .throwOnError();
              return _mapResourceShareRow(data);
            }

            const { data } = await dbClient
              .from("resource_shares")
              .insert({
                workspace_id: options.workspaceId,
                resource_type: options.resourceType,
                resource_id: options.resourceId,
                principal_type: "workspace",
                principal_id: null,
                role: options.role,
              })
              .select(
                `
                id,
                workspace_id,
                resource_type,
                resource_id,
                principal_type,
                principal_id,
                role
              `,
              )
              .single()
              .throwOnError();
            return _mapResourceShareRow(data);
          }

          if (!options.principalId) {
            throw new Error("principalId is required for user and user_group.");
          }

          if (existing?.id) {
            const { data } = await dbClient
              .from("resource_shares")
              .update({
                role: options.role,
                principal_id: options.principalId,
              })
              .eq("id", existing.id)
              .select(
                `
                id,
                workspace_id,
                resource_type,
                resource_id,
                principal_type,
                principal_id,
                role
              `,
              )
              .single()
              .throwOnError();
            return _mapResourceShareRow(data);
          }

          const { data } = await dbClient
            .from("resource_shares")
            .insert({
              workspace_id: options.workspaceId,
              resource_type: options.resourceType,
              resource_id: options.resourceId,
              principal_type: options.principalType,
              principal_id: options.principalId,
              role: options.role,
            })
            .select(
              `
              id,
              workspace_id,
              resource_type,
              resource_id,
              principal_type,
              principal_id,
              role
            `,
            )
            .single()
            .throwOnError();
          return _mapResourceShareRow(data);
        },

        /**
         * Removes a share by id.
         */
        deleteResourceShare: async (options: {
          shareId: string;
        }): Promise<void> => {
          const logger = baseLogger.appendName("deleteResourceShare");
          logger.log("delete share", options);
          await dbClient
            .from("resource_shares")
            .delete()
            .eq("id", options.shareId)
            .throwOnError();
        },

        /**
         * Sets `is_restricted` on a dashboard or dataset row.
         */
        setResourceRestricted: async (options: {
          workspaceId: WorkspaceId;
          resourceType: ResourceType;
          resourceId: string;
          isRestricted: boolean;
        }): Promise<void> => {
          const logger = baseLogger.appendName("setResourceRestricted");
          logger.log("set restricted", options);
          const resourceTable =
            options.resourceType === "dashboard" ? "dashboards" : "datasets";
          await dbClient
            .from(resourceTable)
            .update({ is_restricted: options.isRestricted })
            .eq("id", options.resourceId)
            .eq("workspace_id", options.workspaceId)
            .throwOnError();
        },

        /**
         * Replaces tag links for a resource (user_group tags).
         */
        setResourceUserGroupTags: async (options: {
          workspaceId: WorkspaceId;
          resourceType: ResourceType;
          resourceId: string;
          userGroupIds: readonly string[];
        }): Promise<void> => {
          const logger = baseLogger.appendName("setResourceUserGroupTags");
          logger.log("set resource tags", options);

          await dbClient
            .from("resource_user_group_tags")
            .delete()
            .eq("workspace_id", options.workspaceId)
            .eq("resource_type", options.resourceType)
            .eq("resource_id", options.resourceId)
            .throwOnError();

          if (options.userGroupIds.length === 0) {
            return;
          }

          await dbClient
            .from("resource_user_group_tags")
            .insert(
              options.userGroupIds.map((userGroupId) => {
                return {
                  workspace_id: options.workspaceId,
                  resource_type: options.resourceType,
                  resource_id: options.resourceId,
                  user_group_id: userGroupId,
                };
              }),
            )
            .throwOnError();
        },
      }),
    );

    return withQueryHooks(newClient, {
      queryFns: ["getResourceSharingState"],
      mutationFns: [
        "upsertResourceShare",
        "deleteResourceShare",
        "setResourceRestricted",
        "setResourceUserGroupTags",
      ],
    });
  });

  return finalClient;
}

export const ResourceShareClient = createResourceShareClient(AvaSupabase.db());
