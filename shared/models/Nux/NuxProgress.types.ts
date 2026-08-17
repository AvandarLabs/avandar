import type { NUX_MILESTONE_KEYS } from "$/models/Nux/NuxProgress.constants.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Database } from "$/types/database.types.ts";
import type { UUID } from "@avandar/utils";

export type NuxProgressId = UUID<"NuxProgress">;

/** Mirrors the `nux_status` enum in `supabase/schemas/00.enum.nux_status.sql`. */
export type NuxStatus = Database["public"]["Enums"]["nux_status"];

/** One milestone of the `first_dashboard` tutorial. */
export type NuxMilestoneKey = (typeof NUX_MILESTONE_KEYS)[number];

/** The only tutorial key that exists today. */
export type NuxTutorialKey = "first_dashboard";

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
  /** Only keys the current build recognises; unknown keys are dropped on read. */
  completedMilestones: readonly NuxMilestoneKey[];
  createdAt: Date;
  updatedAt: Date;
};
