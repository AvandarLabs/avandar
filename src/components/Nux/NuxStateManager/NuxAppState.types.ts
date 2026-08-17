import type { NuxProgress } from "$/models/Nux/NuxProgress";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";

export type NuxAppState = {
  /** False until the progress row and the auto-check have both landed. */
  isHydrated: boolean;
  /** Row id, needed for every write. `undefined` before hydration. */
  progressId: NuxProgress.Id | undefined;
  status: NuxProgress.Status | undefined;
  completedMilestones: readonly NuxMilestoneKey[];
  /** The milestone whose tooltips are showing, or `undefined` when none are. */
  activeMilestoneKey: NuxMilestoneKey | undefined;
  /**
   * Index into the active milestone's steps. Deliberately NOT persisted: a
   * hard refresh resumes at the milestone's first tooltip, which costs one
   * tooltip and removes a whole class of resume bugs.
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
};

export const INITIAL_NUX_STATE: NuxAppState = {
  isHydrated: false,
  progressId: undefined,
  status: undefined,
  completedMilestones: [],
  activeMilestoneKey: undefined,
  activeStepIndex: 0,
  isPanelExpanded: false,
  blockedReason: undefined,
  recentDatasetId: undefined,
  recentDashboardId: undefined,
};
