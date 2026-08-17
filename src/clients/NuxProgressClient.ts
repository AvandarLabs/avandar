import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import {
  FIRST_DASHBOARD_TUTORIAL_KEY,
  NUX_MILESTONE_KEYS,
} from "$/models/Nux/NuxProgress.constants";
import { z } from "zod";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import type { ServiceClient } from "@avandar/clients";
import type { ILogger, WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";
import type { NuxProgress } from "$/models/Nux/NuxProgress";
import type {
  NuxMilestoneKey,
  NuxProgressId,
} from "$/models/Nux/NuxProgress.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/**
 * What already exists in the workspace, used once per user to decide which
 * milestones are already satisfied. See `resolveAutoCheckedMilestones`.
 */
export type NuxWorkspaceArtifacts = {
  hasDataset: boolean;
  hasDashboard: boolean;
  hasWorkspaceSharedDashboard: boolean;
};

const _MILESTONE_KEY_SET: ReadonlySet<string> = new Set(NUX_MILESTONE_KEYS);

/**
 * Parses a `user_nux_progress` row into the model.
 *
 * `completed_milestones` is validated as plain strings and then filtered,
 * rather than parsed with `z.enum`. A milestone key renamed in a later build
 * would make `z.enum` throw on an existing row, which would lock that user out
 * of the tutorial with no way back. Dropping the unknown key just replays that
 * milestone, which is the harmless outcome.
 */
export const NuxProgressDBReadToModelReadSchema: z.ZodType<
  NuxProgress.T,
  {
    id: string;
    user_id: string;
    tutorial_key: string;
    status: string;
    completed_milestones: string[];
    created_at: string;
    updated_at: string;
  }
> = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    tutorial_key: z.string(),
    status: z.enum(["not_started", "in_progress", "completed", "dismissed"]),
    completed_milestones: z.array(z.string()),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
  })
  .transform((row): NuxProgress.T => {
    return {
      progressId: row.id as NuxProgressId,
      userId: row.user_id as UserId,
      tutorialKey: FIRST_DASHBOARD_TUTORIAL_KEY,
      status: row.status,
      completedMilestones: row.completed_milestones.filter(
        (key): key is NuxMilestoneKey => {
          return _MILESTONE_KEY_SET.has(key);
        },
      ),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  });

/** Reads the caller's row, or `undefined` when they have never been offered. */
async function _fetchProgressRow(
  dbClient: AvaSupabaseDBClient,
  userId: string,
): Promise<NuxProgress.T | undefined> {
  const { data } = await dbClient
    .from("user_nux_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("tutorial_key", FIRST_DASHBOARD_TUTORIAL_KEY)
    .maybeSingle()
    .throwOnError();
  return data ? NuxProgressDBReadToModelReadSchema.parse(data) : undefined;
}

async function _requireUserId(): Promise<string> {
  const session = await AuthClient.getCurrentSession();
  if (!session?.user) {
    throw new Error("User not found.");
  }
  return session.user.id;
}

type NuxProgressClientQueries = {
  getForCurrentUser: () => Promise<NuxProgress.T | undefined>;
  getWorkspaceArtifacts: (params: {
    workspaceId: Workspace.Id;
  }) => Promise<NuxWorkspaceArtifacts>;
};

type NuxProgressClientMutations = {
  ensureForCurrentUser: () => Promise<NuxProgress.T>;
  updateProgress: (params: {
    progressId: NuxProgress.Id;
    data: {
      status?: NuxProgress.Status;
      completedMilestones?: readonly NuxMilestoneKey[];
    };
  }) => Promise<NuxProgress.T>;
};

type INuxProgressClient = ServiceClient<"NuxProgressClient"> &
  NuxProgressClientQueries &
  NuxProgressClientMutations;

function createNuxProgressClient(): WithLogger<
  WithQueryHooks<
    INuxProgressClient,
    keyof NuxProgressClientQueries,
    keyof NuxProgressClientMutations
  >
> {
  const dbClient = AvaSupabase.db();
  const baseClient = createServiceClient("NuxProgressClient");

  return withLogger(baseClient, (baseLogger: ILogger) => {
    return withQueryHooks(
      {
        ...baseClient,

        /** The caller's progress row, or `undefined` if they have none yet. */
        getForCurrentUser: async (): Promise<NuxProgress.T | undefined> => {
          const logger = baseLogger.appendName("getForCurrentUser");
          const userId = await _requireUserId();
          const progress = await _fetchProgressRow(dbClient, userId);
          logger.log("Nux progress retrieved", { progress });
          return progress;
        },

        /**
         * Whether the workspace already contains the artifacts each milestone
         * produces. Three head-count queries rather than three full selects:
         * the answer is only ever "any?".
         *
         * "Shared to the workspace" is `is_restricted = false`, which is what
         * `GeneralAccessModule` derives the `workspace` dropdown value from.
         */
        getWorkspaceArtifacts: async ({
          workspaceId,
        }: {
          workspaceId: Workspace.Id;
        }): Promise<NuxWorkspaceArtifacts> => {
          const logger = baseLogger.appendName("getWorkspaceArtifacts");
          const [datasets, dashboards, sharedDashboards] = await Promise.all([
            dbClient
              .from("datasets")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", workspaceId)
              .throwOnError(),
            dbClient
              .from("dashboards")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", workspaceId)
              .throwOnError(),
            dbClient
              .from("dashboards")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", workspaceId)
              .eq("is_restricted", false)
              .throwOnError(),
          ]);
          const artifacts: NuxWorkspaceArtifacts = {
            hasDataset: (datasets.count ?? 0) > 0,
            hasDashboard: (dashboards.count ?? 0) > 0,
            hasWorkspaceSharedDashboard: (sharedDashboards.count ?? 0) > 0,
          };
          logger.log("Workspace artifacts retrieved", artifacts);
          return artifacts;
        },

        /**
         * The caller's row, created at its defaults if absent.
         *
         * Read-then-insert rather than a plain upsert: an upsert with
         * `ignoreDuplicates: false` would reset `status` to `not_started` on
         * every call and re-show the invite forever. `ignoreDuplicates: true`
         * keeps a concurrent first call from failing on the unique constraint.
         */
        ensureForCurrentUser: async (): Promise<NuxProgress.T> => {
          const logger = baseLogger.appendName("ensureForCurrentUser");
          const userId = await _requireUserId();
          const existing = await _fetchProgressRow(dbClient, userId);
          if (existing) {
            return existing;
          }
          await dbClient
            .from("user_nux_progress")
            .upsert(
              {
                user_id: userId,
                tutorial_key: FIRST_DASHBOARD_TUTORIAL_KEY,
              },
              {
                onConflict: "user_id,tutorial_key",
                ignoreDuplicates: true,
              },
            )
            .throwOnError();
          const created = await _fetchProgressRow(dbClient, userId);
          if (!created) {
            throw new Error("Failed to create Nux progress row.");
          }
          logger.log("Nux progress row created", { created });
          return created;
        },

        /** Writes status and/or completed milestones back. */
        updateProgress: async ({
          progressId,
          data,
        }: {
          progressId: NuxProgress.Id;
          data: {
            status?: NuxProgress.Status;
            completedMilestones?: readonly NuxMilestoneKey[];
          };
        }): Promise<NuxProgress.T> => {
          const logger = baseLogger.appendName("updateProgress");
          logger.log("Updating Nux progress", { progressId, data });
          const { data: row } = await dbClient
            .from("user_nux_progress")
            .update({
              ...(data.status !== undefined ? { status: data.status } : {}),
              ...(data.completedMilestones !== undefined ?
                { completed_milestones: [...data.completedMilestones] }
              : {}),
            })
            .eq("id", progressId)
            .select("*")
            .single()
            .throwOnError();
          return NuxProgressDBReadToModelReadSchema.parse(row);
        },
      },
      {
        queryFns: ["getForCurrentUser", "getWorkspaceArtifacts"],
        mutationFns: ["ensureForCurrentUser", "updateProgress"],
      },
    );
  });
}

/** Client for the per-user onboarding tutorial progress row. */
export const NuxProgressClient = createNuxProgressClient();
