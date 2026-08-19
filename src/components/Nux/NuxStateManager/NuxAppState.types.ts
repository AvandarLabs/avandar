import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

/**
 * The tutorial's runtime state for one session, seeded from the persisted
 * `user_nux_progress` row.
 */
export type NuxAppState = {
  /** False until the progress row and the auto-check have both landed. */
  isHydrated: boolean;
  /** Row id, needed for every write. `undefined` before hydration. */
  progressId: NuxProgress.Id | undefined;
  status: NuxProgress.Status | undefined;
  completedMilestones: readonly NuxProgress.MilestoneKey[];
  /** The milestone whose tooltips are showing, or `undefined` when none are. */
  activeMilestoneKey: NuxProgress.MilestoneKey | undefined;
  /**
   * Index into the active milestone's currently visible steps. Deliberately
   * NOT persisted: a hard refresh resumes at the milestone's first tooltip,
   * which costs one tooltip and removes a whole class of resume bugs.
   */
  activeStepIndex: number;
  isPanelExpanded: boolean;
  /**
   * Why the active milestone cannot be finished (plan limit, offline, unsaved
   * changes). Set from the share modal's own blocked reason so the tour never
   * spotlights a dead control.
   */
  blockedReason: string | undefined;
  /**
   * Ids captured from completion events so later milestones can route to the
   * right place. Ephemeral by design: they are a convenience for this session,
   * not state worth a database column.
   */
  recentDatasetId: string | undefined;
  recentDashboardId: string | undefined;
  /**
   * When true, artifact catch-up is skipped so a profile restart is not
   * immediately overwritten by datasets and dashboards that already exist.
   */
  isCatchUpSuppressed: boolean;
  /**
   * Keys the user unmarked this session. Artifact catch-up must not re-tick
   * these until a live completion or another mark-done.
   */
  userUnmarkedMilestones: readonly NuxProgress.MilestoneKey[];
};
