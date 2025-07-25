import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AuthClient } from "@/clients/AuthClient";
import { createBaseClient } from "@/lib/clients/BaseClient";
import { SupabaseDBClient } from "@/lib/clients/supabase/SupabaseDBClient";
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
import { uuid } from "@/lib/utils/uuid";
import { Database, Tables } from "@/types/database.types";
import { WorkspaceId } from "../Workspace/types";
import { MembershipId, UserId, UserProfile, UserProfileId } from "./types";

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

const UserProfileDBReadToModelReadSchema: z.ZodType<
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
  })
  .transform((obj): UserProfile => {
    const model = omit(camelCaseKeysShallow(obj), ["id"]);
    return {
      ...model,
      profileId: uuid<UserProfileId>(obj.id),
      membershipId: uuid<MembershipId>(model.membershipId),
      userId: uuid<UserId>(model.userId),
      workspaceId: uuid<WorkspaceId>(model.workspaceId),
      createdAt: new Date(model.createdAt),
      updatedAt: new Date(model.updatedAt),
    };
  });

function createUserClient(options?: TUserClientOptions): TUserClient {
  const { dbClient = SupabaseDBClient } = options ?? {};
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
