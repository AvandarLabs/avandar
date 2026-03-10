import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { WithQueryHooks, withQueryHooks } from "@avandar/react-query";
import { camelCaseKeysShallow, omit } from "@avandar/utils";
import { Workspace } from "$/models/Workspace/Workspace";
import { WorkspaceId } from "$/models/Workspace/Workspace.types";
import { Database, Tables } from "$/types/database.types";
import {
  WithSupabaseClient,
  withSupabaseClient,
} from "packages/clients/src/SupabaseCRUDClient/withSupabaseClient";
import { z } from "zod";
import { AuthClient } from "@/clients/AuthClient";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import type { ServiceClient } from "@avandar/clients";
import type { ILogger, WithLogger } from "@avandar/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MembershipId,
  UserId,
  UserProfile,
  UserProfileId,
} from "$/models/User/User.types";

type TUserClient = WithSupabaseClient<
  WithLogger<
    WithQueryHooks<
      ServiceClient<"UserClient"> & {
        getProfile: ({
          workspaceId,
        }: {
          workspaceId: Workspace.Id;
        }) => Promise<UserProfile>;
      },
      "getProfile",
      never
    >
  >
>;

type TUserClientOptions = {
  dbClient?: SupabaseClient<Database>;
};

export const UserProfileDBReadToModelReadSchema: z.ZodType<
  UserProfile,
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
  .transform((obj): UserProfile => {
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
        }): Promise<UserProfile> => {
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
      },
      {
        queryFns: ["getProfile"],
        mutationFns: [],
      },
    );
  });

  return withSupabaseClient(client, (newDBClient: SupabaseClient<Database>) => {
    return createUserClient({ ...options, dbClient: newDBClient });
  });
}

export const UserClient = createUserClient();
