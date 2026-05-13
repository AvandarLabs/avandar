import { createServiceClient } from "@clients/ServiceClient/createServiceClient";
import { withSupabaseClient } from "@clients/SupabaseCRUDClient/withSupabaseClient";
import { withQueryHooks } from "@hooks/withQueryHooks/withQueryHooks";
import { WithQueryHooks } from "@hooks/withQueryHooks/withQueryHooks.types";
import { withLogger } from "@logger/module-augmenters/withLogger";
import { makeObject } from "@utils/index";
import { camelCaseKeysShallow } from "@utils/objects/camelCaseKeys/camelCaseKeys";
import { omit } from "@utils/objects/omit/omit";
import { WorkspaceId } from "$/models/Workspace/Workspace.types";
import { Database, Tables } from "$/types/database.types";
import { z } from "zod";
import { AuthClient } from "@/clients/AuthClient";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import type { ServiceClient } from "@clients/ServiceClient/ServiceClient.types";
import type { WithSupabaseClient } from "@clients/SupabaseCRUDClient/withSupabaseClient";
import type { ILogger, WithLogger } from "@logger/Logger.types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserAppRolesRecord } from "$/models/Permissions/Permissions.types";
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
        }) => Promise<UserAppRolesRecord>;
      },
      "getProfile" | "getUserAppRoles",
      never
    >
  >
>;

type TUserClientOptions = {
  dbClient?: SupabaseClient<Database>;
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
  const { dbClient = AvaSupabase.DB } = options ?? {};
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
        }): Promise<UserAppRolesRecord> => {
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

  return withSupabaseClient(client, (newDBClient: SupabaseClient<Database>) => {
    return createUserClient({ ...options, dbClient: newDBClient });
  });
}

export const UserClient = createUserClient();
