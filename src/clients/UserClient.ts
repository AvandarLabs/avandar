import { createServiceClient, withSupabaseClient } from "@clients";
import { withQueryHooks, WithQueryHooks } from "@hooks";
import { withLogger } from "@logger";
import { camelCaseKeysShallow, makeObject, omit } from "@utils";
import { WorkspaceId } from "$/models/Workspace/Workspace.types";
import { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import { Tables } from "$/types/database.types";
import { z } from "zod";
import { AuthClient } from "@/clients/AuthClient";
import { AvaSupabase } from "$/db/supabase/AvaSupabase.ts";
import type { ServiceClient } from "@clients";
import type { WithSupabaseClient } from "@clients/mixins/withSupabaseClient";
import type { ILogger, WithLogger } from "@logger";
import type { UserAppRolesMatrix } from "$/models/Permissions/Permissions.types";
import type { UserId } from "$/models/User/User.types";
import type { UserProfile } from "$/models/User/UserProfile";
import type {
  MembershipId,
  UserProfileId,
} from "$/models/User/UserProfile.types";

type TUserClient = WithSupabaseClient<
  WithLogger<
    WithQueryHooks<
      ServiceClient<"UserClient"> & {
        getProfile: ({
          workspaceId,
        }: {
          workspaceId: WorkspaceId;
        }) => Promise<UserProfile.T>;
        getUserAppRoles: (params: {
          workspaceId: WorkspaceId;
          userId: UserId | undefined;
        }) => Promise<UserAppRolesMatrix>;
      },
      "getProfile" | "getUserAppRoles",
      never
    >
  >
>;

type TUserClientOptions = {
  dbClient?: AvaSupabaseDBClient;
};

export const UserProfileDBReadToModelReadSchema: z.ZodType<
  UserProfile.T,
  Tables<"user_profiles">
> = z
  .object({
    id: z.uuid(),
    membership_id: z.uuid(),
    user_id: z.uuid(),
    workspace_id: z.uuid(),
    email: z.string(),
    full_name: z.string(),
    display_name: z.string(),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
    polar_product_id: z.uuid().nullable(),
    subscription_id: z.uuid().nullable(),
  })
  .transform((obj): UserProfile.T => {
    const model = omit(camelCaseKeysShallow(obj), ["id"]);
    return {
      ...model,
      profileId: obj.id as UserProfileId,
      membershipId: model.membershipId as MembershipId,
      userId: model.userId as UserId,
      workspaceId: model.workspaceId as WorkspaceId,
      createdAt: new Date(model.createdAt),
      updatedAt: new Date(model.updatedAt),
    };
  });

function createUserClient(options?: TUserClientOptions): TUserClient {
  const { dbClient = AvaSupabase.db() } = options ?? {};
  const baseClient = createServiceClient("UserClient");

  const client = withLogger(baseClient, (baseLogger: ILogger) => {
    return withQueryHooks(
      {
        ...baseClient,

        /**
         * Get the user profile for the given workspace
         *
         * One user may have many profiles for different workspaces, so to get a
         * user profile we also need to specify the workspace.
         * @param workspaceId
         */
        getProfile: async ({
          workspaceId,
        }: {
          workspaceId: WorkspaceId;
        }): Promise<UserProfile.T> => {
          const logger = baseLogger.appendName("getProfile");
          logger.log("Calling `getProfile` with params", {
            workspaceId,
          });

          const session = await AuthClient.getCurrentSession();
          if (!session?.user) {
            throw new Error("User not found.");
          }

          const { data } = await dbClient
            .from("user_profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("workspace_id", workspaceId)
            .single()
            .throwOnError();

          const userProfile = UserProfileDBReadToModelReadSchema.parse({
            ...data,

            // user email has to come from the auth session
            email: session.user.email,
          });

          logger.log("User profile retrieved", { userProfile });
          return userProfile;
        },

        /**
         * Loads per-app roles for a user in a workspace from
         * `workspace_memberships` and nested `role_group_app_roles`.
         *
         * @param params.workspaceId Target workspace.
         * @param params.userId Auth user id; required at runtime for the query.
         */
        getUserAppRoles: async ({
          workspaceId,
          userId,
        }: {
          workspaceId: WorkspaceId;
          userId: UserId | undefined;
        }): Promise<UserAppRolesMatrix> => {
          const logger = baseLogger.appendName("getUserAppRoles");
          logger.log("Calling `getUserAppRoles`", { workspaceId, userId });
          if (userId === undefined) {
            throw new Error("getUserAppRoles requires a user id.");
          }

          const { data: membership } = await dbClient
            .from("workspace_memberships")
            .select(
              `
              role_group_id,
              role_groups (
                role_group_app_roles (
                  app,
                  role
                )
              )
            `,
            )
            .eq("workspace_id", workspaceId)
            .eq("user_id", userId)
            .maybeSingle()
            .throwOnError();

          if (!membership) {
            throw new Error("Workspace membership not found.");
          }

          const appRolesList =
            membership?.role_groups?.role_group_app_roles ?? [];
          const appRoles = makeObject(appRolesList, {
            key: "app",
            valueKey: "role",
          });

          logger.log("User app roles retrieved", { appRoles });
          return appRoles;
        },
      },
      {
        queryFns: ["getProfile", "getUserAppRoles"],
        mutationFns: [],
      },
    );
  });

  // Do not use `client.mixin(withSupabaseClient(...))`: `createModule` mixin
  // rebuilds members from the base service client slice only, which drops
  // `withQueryHooks` methods such as `useGetProfile` / `useGetUserAppRoles`.
  return {
    ...client,
    ...withSupabaseClient(dbClient)().members,
  } as unknown as TUserClient;
}

export const UserClient = createUserClient({
  dbClient: AvaSupabase.db(),
});
