import { isDefined } from "$/lib/utils/guards/isDefined";
import { APIClient } from "@/clients/APIClient";
import { AuthClient } from "@/clients/AuthClient";
import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { isOneOf } from "@/lib/utils/guards/guards";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { SubscriptionParsers } from "../Subscription/SubscriptionParsers";
import { UserId, UserProfileWithRole } from "../User/User.types";
import { UserProfileDBReadToModelReadSchema } from "../User/UserClient";
import {
  Workspace,
  WorkspaceId,
  WorkspaceInvite,
  WorkspaceWithSubscription,
} from "./Workspace.types";
import { WorkspaceParsers } from "./WorkspaceParsers";

export const WorkspaceClient = createSupabaseCRUDClient({
  modelName: "Workspace",
  tableName: "workspaces",
  dbTablePrimaryKey: "id",
  parsers: WorkspaceParsers,
  queries: ({ clientLogger, dbClient, parsers }) => {
    return {
      getWorkspacesOfCurrentUser: async (): Promise<
        WorkspaceWithSubscription[]
      > => {
        const logger = clientLogger.appendName("getWorkspacesOfCurrentUser");
        logger.log("Calling getWorkspacesOfCurrentUser");

        const session = await AuthClient.getCurrentSession();
        if (!session?.user) {
          logger.error("Could not get workspaces of an unauthenticated user.");
          return [];
        }

        const { data: memberships } = await dbClient
          .from("workspace_memberships")
          .select(`workspace:workspaces (*, subscription:subscriptions (*))`)
          .eq("user_id", session.user.id)
          .throwOnError();

        const workspaces = memberships.map(prop("workspace"));

        logger.log("Found user workspaces", workspaces);

        return workspaces.map((workspace) => {
          const workspaceModel = parsers.fromDBReadToModelRead(workspace);

          // TODO(jpsyx): clean this up with a proper parser for a Subscription
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
        workspaceId: WorkspaceId;
      }): Promise<UserProfileWithRole[]> => {
        const logger = clientLogger.appendName("getUsersForWorkspace");
        logger.log("Fetching all users for workspace", { workspaceId });

        const session = await AuthClient.getCurrentSession();
        if (!session?.user) {
          throw new Error("User not found.");
        }

        const { data: memberships } = await dbClient
          .from("workspace_memberships")
          .select("*, user_profile:user_profiles (*), user_role:user_roles (*)")
          .eq("workspace_id", workspaceId)
          .throwOnError();

        const profiles: UserProfileWithRole[] = memberships
          .map((membership) => {
            if (
              membership.user_profile &&
              membership.user_role &&
              isOneOf(membership.user_role.role, ["admin", "member"])
            ) {
              const profile = UserProfileDBReadToModelReadSchema.parse({
                ...membership.user_profile,
                email: session?.user?.email,
              });
              const role = membership.user_role.role;
              return {
                ...profile,
                role,
              };
            }
            return undefined;
          })
          .filter(isDefined);

        return profiles;
      },

      getPendingInvites: async ({
        workspaceId,
      }: {
        workspaceId: WorkspaceId;
      }): Promise<WorkspaceInvite[]> => {
        const logger = clientLogger.appendName("getPendingInvites");
        logger.log("Fetching pending invites for workspace", { workspaceId });

        const { data: invites } = await dbClient
          .from("workspace_invites")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("invite_status", "pending")
          .throwOnError();
        return invites;
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
      }): Promise<Workspace> => {
        const logger = clientLogger.appendName("createWorkspaceWithOwner");
        logger.log("Creating workspace with owner", params);

        const { workspaceName, workspaceSlug, ownerName, ownerDisplayName } =
          params;

        // creating a workspace involves many database operations, so we use a
        // stored procedure to handle it
        const { data: workspace } = await dbClient
          .rpc("rpc_workspaces__create_with_owner", {
            p_workspace_name: workspaceName,
            p_workspace_slug: workspaceSlug,
            p_full_name: ownerName,
            p_display_name: ownerDisplayName,
          })
          .throwOnError();

        logger.log("Successfully created workspace", workspace);
        return parsers.fromDBReadToModelRead(workspace);
      },

      removeMember: async (params: {
        workspaceId: WorkspaceId;
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

        // also remove them from the invites list if they were invited before
        await dbClient
          .from("workspace_invites")
          .delete()
          .match({ workspace_id: workspaceId, user_id: userId })
          .throwOnError();

        logger.log("Successfully removed member from workspace");
      },
    };
  },
});
