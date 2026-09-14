import type {
  FIRST_DASHBOARD_TUTORIAL_KEY,
  NUX_MILESTONE_KEYS,
} from "$/models/NuxProgress/NuxProgress.constants.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Database } from "$/types/database.types.ts";
import type { UUID } from "@avandar/utils";

export type NuxProgressId = UUID<"NuxProgress">;

/** Mirrors the `nux_status` enum in `supabase/schemas/40.enum.nux_status`. */
export type NuxStatus = Database["public"]["Enums"]["nux_status"];

/** One milestone of the `first_dashboard` tutorial. */
export type NuxMilestoneKey = (typeof NUX_MILESTONE_KEYS)[number];

/** The only tutorial key that exists today. */
export type NuxTutorialKey = typeof FIRST_DASHBOARD_TUTORIAL_KEY;

/**
 * A user's progress through one tutorial.
 *
 * There is no `workspaceId`, and that is the point: the tutorial is a
 * once-per-person event, so joining or creating a second workspace must not
 * re-trigger it.
 */
export type NuxProgressRead = {
  progressId: NuxProgressId;
  userId: UserId;
  tutorialKey: NuxTutorialKey;
  status: NuxStatus;
  /** Only keys this build knows; unknown keys are dropped on read. */
  completedMilestones: readonly NuxMilestoneKey[];
  /**
   * When true, workspace-artifact catch-up must not complete milestones.
   * Restart sets this so a replay is not immediately re-ticked.
   */
  isCatchUpSuppressed: boolean;
  createdAt: Date;
  updatedAt: Date;
};
