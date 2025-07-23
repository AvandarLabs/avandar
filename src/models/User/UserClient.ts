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
import { camelCaseKeysShallow } from "@/lib/utils/objects/transformations";
import { uuid } from "@/lib/utils/uuid";
import { Database } from "@/types/database.types";
import { WorkspaceId } from "../Workspace/types";
import { UserId, UserProfile, WorkspaceUser } from "./types";

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
        getUsersForWorkspace: ({
          workspaceId,
        }: {
          workspaceId: WorkspaceId;
        }) => Promise<WorkspaceUser[]>; // <- add this line
      },
      "getProfile" | "getUsersForWorkspace", // <- include it here too
      never
    >
  >
>;

type TUserClientOptions = {
  dbClient?: SupabaseClient<Database>;
};

const UserProfileDBReadToModelReadSchema = z
  .object({
    id: z.string().uuid(),
    workspace_id: z.string().uuid(),
    email: z.string(),
    full_name: z.string(),
    display_name: z.string(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .transform((obj) => {
    const model = camelCaseKeysShallow(obj);
    return {
      ...model,
      id: uuid<UserId>(model.id),
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
        getUsersForWorkspace: async ({
          workspaceId,
        }: {
          workspaceId: WorkspaceId;
        }): Promise<WorkspaceUser[]> => {
          const logger = baseLogger.appendName("getUsersForWorkspace");
          logger.log("Fetching all users for workspace", { workspaceId });

          // Step 1: Get all user profiles in the workspace
          const { data: profiles } = await dbClient
            .from("user_profiles")
            .select("*")
            .eq("workspace_id", workspaceId)
            .throwOnError();

          // Step 2: Get all user roles in the workspace
          const userIds = profiles.map((p) => p.user_id);
          const { data: roles } = await dbClient
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds)
            .eq("workspace_id", workspaceId)
            .throwOnError();

          // Step 3: Create lookup map of user_id -> role
          const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));

          // Step 4: Merge role into user profile, convert to model
          const transformed = profiles.map((row) => {
            const model = camelCaseKeysShallow(row);
            return {
              ...model,
              id: uuid<UserId>(model.id),
              workspaceId: uuid<WorkspaceId>(model.workspaceId),
              createdAt: new Date(model.createdAt),
              updatedAt: new Date(model.updatedAt),
              role: roleMap.get(row.user_id) ?? "member",
            };
          });

          logger.log("Users retrieved", { users: transformed });
          return transformed;
        },
      },
      {
        queryFns: ["getProfile", "getUsersForWorkspace"],
        mutationFns: [],
      },
    );
  });

  return withSupabaseClient(client, (newDBClient: SupabaseClient<Database>) => {
    return createUserClient({ ...options, dbClient: newDBClient });
  });
}

export const UserClient = createUserClient();
