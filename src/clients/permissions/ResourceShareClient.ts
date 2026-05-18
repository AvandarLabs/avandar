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
  requiresAppAccess: boolean;
};

export type ResourceSharingState = {
  isRestricted: boolean;
  ownerId: string;
  shares: ResourceShareRow[];
};

function _mapResourceShareRow(row: {
  id: string;
  workspace_id: string;
  resource_type: ResourceType;
  resource_id: string;
  principal_type: SharePrincipalType;
  principal_id: string | null;
  role: RoleLevel;
  requires_app_access: boolean;
}): ResourceShareRow {
  return {
    id: row.id,
    workspaceId: row.workspace_id as WorkspaceId,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    principalType: row.principal_type,
    principalId: row.principal_id,
    role: row.role,
    requiresAppAccess: row.requires_app_access,
  };
}

const _SHARE_ROW_PROJECTION = `
  id,
  workspace_id,
  resource_type,
  resource_id,
  principal_type,
  principal_id,
  role,
  requires_app_access
`;

type UpsertShareOptions = {
  workspaceId: WorkspaceId;
  resourceType: ResourceType;
  resourceId: string;
  principalType: SharePrincipalType;
  principalId: string | null;
  role: RoleLevel;
  requiresAppAccess?: boolean;
};

async function _findExistingShareId(
  dbClient: AvaSupabaseDBClient,
  options: UpsertShareOptions,
): Promise<string | null> {
  let query = dbClient
    .from("resource_shares")
    .select("id")
    .eq("workspace_id", options.workspaceId)
    .eq("resource_type", options.resourceType)
    .eq("resource_id", options.resourceId)
    .eq("principal_type", options.principalType);

  if (options.principalType === "workspace") {
    query = query.is("principal_id", null);
  } else {
    query = query.eq("principal_id", options.principalId!);
  }

  const { data } = await query.maybeSingle().throwOnError();
  return data?.id ?? null;
}

async function _updateShareById(
  dbClient: AvaSupabaseDBClient,
  shareId: string,
  patch: { role: RoleLevel; principalId?: string; requiresAppAccess?: boolean },
): Promise<ResourceShareRow> {
  const updatePayload: {
    role: RoleLevel;
    principal_id?: string;
    requires_app_access?: boolean;
  } = { role: patch.role };
  if (patch.principalId !== undefined) {
    updatePayload.principal_id = patch.principalId;
  }
  if (patch.requiresAppAccess !== undefined) {
    updatePayload.requires_app_access = patch.requiresAppAccess;
  }
  const { data } = await dbClient
    .from("resource_shares")
    .update(updatePayload)
    .eq("id", shareId)
    .select(_SHARE_ROW_PROJECTION)
    .single()
    .throwOnError();
  return _mapResourceShareRow(data);
}

async function _insertShare(
  dbClient: AvaSupabaseDBClient,
  options: UpsertShareOptions,
): Promise<ResourceShareRow> {
  const { data } = await dbClient
    .from("resource_shares")
    .insert({
      workspace_id: options.workspaceId,
      resource_type: options.resourceType,
      resource_id: options.resourceId,
      principal_type: options.principalType,
      principal_id:
        options.principalType === "workspace" ? null : options.principalId,
      role: options.role,
      requires_app_access: options.requiresAppAccess ?? false,
    })
    .select(_SHARE_ROW_PROJECTION)
    .single()
    .throwOnError();
  return _mapResourceShareRow(data);
}

/**
 * CRUD for `resource_shares` and `is_restricted` on resources.
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
         * Loads shares and restriction flag for one resource.
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

          const [{ data: resourceRow }, { data: shareRows }] =
            await Promise.all([
              dbClient
                .from(resourceTable)
                .select("is_restricted, owner_id")
                .eq("id", options.resourceId)
                .eq("workspace_id", options.workspaceId)
                .single()
                .throwOnError(),
              dbClient
                .from("resource_shares")
                .select(_SHARE_ROW_PROJECTION)
                .eq("workspace_id", options.workspaceId)
                .eq("resource_type", options.resourceType)
                .eq("resource_id", options.resourceId)
                .throwOnError(),
            ]);

          return {
            isRestricted: resourceRow.is_restricted,
            ownerId: resourceRow.owner_id,
            shares: (shareRows ?? []).map(_mapResourceShareRow),
          };
        },

        /**
         * Upserts one share row (user, user_group, or workspace principal).
         * Throws if `requiresAppAccess` is true for any principal other than
         * `user_group` (mirrors the SQL check constraint).
         */
        upsertResourceShare: async (
          options: UpsertShareOptions,
        ): Promise<ResourceShareRow> => {
          const logger = baseLogger.appendName("upsertResourceShare");
          logger.log("upsert share", options);

          if (
            options.requiresAppAccess === true &&
            options.principalType !== "user_group"
          ) {
            throw new Error(
              "requiresAppAccess applies only to user_group shares.",
            );
          }
          if (options.principalType !== "workspace" && !options.principalId) {
            throw new Error("principalId is required for user and user_group.");
          }

          const existingId = await _findExistingShareId(dbClient, options);
          if (existingId) {
            return _updateShareById(dbClient, existingId, {
              role: options.role,
              principalId:
                options.principalType === "workspace" ?
                  undefined
                : (options.principalId ?? undefined),
              requiresAppAccess: options.requiresAppAccess,
            });
          }
          return _insertShare(dbClient, options);
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
      }),
    );

    return withQueryHooks(newClient, {
      queryFns: ["getResourceSharingState"],
      mutationFns: [
        "upsertResourceShare",
        "deleteResourceShare",
        "setResourceRestricted",
      ],
    });
  });

  return finalClient;
}

export const ResourceShareClient = createResourceShareClient(AvaSupabase.db());
