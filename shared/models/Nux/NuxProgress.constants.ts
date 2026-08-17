/**
 * The four milestones of the `first_dashboard` tutorial, in the order a user
 * walks them. Order is meaningful: `getFirstUnfinishedMilestoneKey` and the
 * auto-check both read this array positionally.
 */
export const NUX_MILESTONE_KEYS = [
  "add_dataset",
  "run_query",
  "build_dashboard",
  "share_dashboard",
] as const;

/**
 * The only tutorial that ships. `user_nux_progress` is keyed on
 * (user_id, tutorial_key) so a catalog is additive later.
 */
export const FIRST_DASHBOARD_TUTORIAL_KEY = "first_dashboard";
