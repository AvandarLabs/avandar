import { isDefined, prop } from "@avandar/utils";
import { SubscriptionParsers } from "$/models/Subscription/SubscriptionParsers";
import { Workspace } from "$/models/Workspace/Workspace";
import { WorkspaceParsers } from "$/models/Workspace/WorkspaceParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createServerApiClient } from "$/ServerApiClient";
import { APIClient } from "@/clients/APIClient";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { UserProfileDBReadToModelReadSchema } from "@/clients/UserClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceMemberProfile } from "$/models/User/UserProfile.types";

// Platform-aware server API client; lazy-readable from any mutation/query.
const serverApi = createServerApiClient();

export const WorkspaceClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Workspace",
    tableName: "workspaces",
    dbTablePrimaryKey: "id",
    parsers: WorkspaceParsers,
    queries: ({ clientLogger, dbClient, parsers }) => {
      return {
        getWorkspacesOfCurrentUser: async (): Promise<
          Workspace.WithSubscription[]
        > => {
          const logger = clientLogger.appendName("getWorkspacesOfCurrentUser");
          logger.log("Calling getWorkspacesOfCurrentUser");

          const session = await AuthClient.getCurrentSession();
          if (!session?.user) {
            logger.error(
              "Could not get workspaces of an unauthenticated user.",
            );
            return [];
          }

          const { data: memberships } = await dbClient
            .from("workspace_memberships")
            .select(`workspace:workspaces (*, subscription:subscriptions (*))`)
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .throwOnError();

          const workspaces = memberships.map(prop("workspace"));

          logger.log("Found user workspaces", workspaces);

          return workspaces.map((workspace) => {
            const workspaceModel = parsers.fromDBReadToModelRead(workspace);

            // TODO(jpsyx): clean this up with a proper parser for a
            // Subscription
            return {
              ...workspaceModel,
              subscription:
                workspace.subscription ?
                  SubscriptionParsers.fromDBReadToModelRead(
                    workspace.subscription,
                  )
                : undefined,
            };
          });
        },

        getUsersForWorkspace: async ({
          workspaceId,
        }: {
          workspaceId: Workspace.Id;
        }): Promise<WorkspaceMemberProfile[]> => {
          const logger = clientLogger.appendName("getUsersForWorkspace");
          logger.log("Fetching all users for workspace", { workspaceId });

          const session = await AuthClient.getCurrentSession();
          if (!session?.user) {
            throw new Error("User not found.");
          }

          const [{ data: memberships }, { data: tagMemberships }] =
            await Promise.all([
              dbClient
                .from("workspace_memberships")
                .select(
                  `
              *,
              user_profile:user_profiles (*),
              role_groups (
                id,
                name,
                is_builtin,
                role_group_app_roles ( app, role )
              )
            `,
                )
                .eq("workspace_id", workspaceId)
                .throwOnError(),
              dbClient
                .from("user_group_memberships")
                .select(
                  `
              user_id,
              user_groups!inner ( id, name, color, workspace_id )
            `,
                )
                .eq("user_groups.workspace_id", workspaceId)
                .throwOnError(),
            ]);

          const tagsByUserId = new Map<
            string,
            Array<{ id: string; name: string; color: string }>
          >();
          for (const row of tagMemberships ?? []) {
            const ug = row.user_groups as {
              id: string;
              name: string;
              color: string;
            };
            const uid = row.user_id;
            const list = tagsByUserId.get(uid) ?? [];
            list.push({ id: ug.id, name: ug.name, color: ug.color });
            tagsByUserId.set(uid, list);
          }

          const profiles: WorkspaceMemberProfile[] = (memberships ?? [])
            .map((membership) => {
              if (!membership.user_profile) {
                return undefined;
              }

              const rowEmail =
                membership.user_profile.user_id === session.user.id ?
                  (session.user.email ?? "")
                : "";
              const profile = UserProfileDBReadToModelReadSchema.parse({
                ...membership.user_profile,
                email: rowEmail,
              });
              const roleGroup = membership.role_groups;
              return {
                ...profile,
                roleGroupId: roleGroup?.id ?? null,
                roleGroupName: roleGroup?.name ?? null,
                roleGroupIsBuiltin: roleGroup?.is_builtin ?? null,
                tags: tagsByUserId.get(membership.user_id) ?? [],
              };
            })
            .filter(isDefined);

          return profiles;
        },
      };
    },

    mutations: ({ clientLogger, dbClient, parsers }) => {
      return {
        validateWorkspaceSlug: async (options: {
          workspaceSlug: string;
        }): Promise<{ isValid: true } | { isValid: false; reason: string }> => {
          const logger = clientLogger.appendName("validateWorkspaceSlug");
          logger.log("Checking if workspace slug exists", {
            workspaceSlug: options.workspaceSlug,
          });
          const validationResult = await APIClient.post({
            route: "workspaces/validate-slug",
            body: {
              slug: options.workspaceSlug,
            },
          });
          return validationResult;
        },

        createWorkspaceWithOwner: async (params: {
          workspaceName: string;
          workspaceSlug: string;
          ownerName: string;
          ownerDisplayName: string;
        }): Promise<Workspace.T> => {
          const logger = clientLogger.appendName("createWorkspaceWithOwner");
          logger.log("Creating workspace with owner", params);

          const { workspaceName, workspaceSlug, ownerName, ownerDisplayName } =
            params;

          // creating a workspace involves many database operations, so we
          // use a stored procedure to handle it
          const workspace = await serverApi.rpc<
            Parameters<typeof parsers.fromDBReadToModelRead>[0]
          >("rpc_workspaces__create_with_owner", {
            p_workspace_name: workspaceName,
            p_workspace_slug: workspaceSlug,
            p_full_name: ownerName,
            p_display_name: ownerDisplayName,
          });

          logger.log("Successfully created workspace", workspace);
          return parsers.fromDBReadToModelRead(workspace);
        },

        removeMember: async (params: {
          workspaceId: Workspace.Id;
          userId: UserId;
        }): Promise<void> => {
          const logger = clientLogger.appendName("removeMember");

          logger.log("Removing member from workspace", params);

          const { workspaceId, userId } = params;

          await dbClient
            .from("workspace_memberships")
            .delete()
            .match({ workspace_id: workspaceId, user_id: userId })
            .throwOnError();

          // also remove them from the invites list if they were invited
          // before
          await dbClient
            .from("workspace_invites")
            .delete()
            .match({ workspace_id: workspaceId, user_id: userId })
            .throwOnError();

          logger.log("Successfully removed member from workspace");
        },
      };
    },
  }),
  {
    queryFns: ["getWorkspacesOfCurrentUser", "getUsersForWorkspace"],
    mutationFns: [
      "validateWorkspaceSlug",
      "createWorkspaceWithOwner",
      "removeMember",
    ],
  },
);
