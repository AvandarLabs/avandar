import { iso, object, string, uuid } from "zod";
import { AuthClient } from "@/clients/AuthClient";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createBaseClient } from "@/lib/clients/BaseClient";
import { WithLogger, withLogger } from "@/lib/clients/withLogger";
import {
  WithQueryHooks,
  withQueryHooks,
} from "@/lib/clients/withQueryHooks/withQueryHooks";
import {
  WithSupabaseClient,
  withSupabaseClient,
} from "@/lib/clients/withSupabaseClient";
import { ILogger } from "@/lib/Logger";
import { omit } from "@/lib/utils/objects/misc";
import { camelCaseKeysShallow } from "@/lib/utils/objects/transformations";
import { Database, Tables } from "@/types/database.types";
import { WorkspaceId } from "../Workspace/Workspace.types";
import { MembershipId, UserId, UserProfile, UserProfileId } from "./User.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";

type TUserClient = WithSupabaseClient<
  WithLogger<
    WithQueryHooks<
      {
        getClientName: () => string;
        getProfile: ({
          workspaceId,
        }: {
          workspaceId: WorkspaceId;
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

const UserProfileDBReadToModelReadSchema: ZodType<
  UserProfile,
  Tables<"user_profiles">
> = object({
  id: uuid(),
  membership_id: uuid(),
  user_id: uuid(),
  workspace_id: uuid(),
  email: string(),
  full_name: string(),
  display_name: string(),
  created_at: iso.datetime({ offset: true }),
  updated_at: iso.datetime({ offset: true }),
  polar_product_id: uuid().nullable(),
  subscription_id: uuid().nullable(),
}).transform((obj): UserProfile => {
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
  const baseClient = createBaseClient("User");

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
