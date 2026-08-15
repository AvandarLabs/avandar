import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * Orders the dashboards index: yours first, then everything RLS returned,
 * each group newest first.
 *
 * The index used to filter on `owner_id`, so order never mattered. Now that a
 * dashboard shared with you appears here too, your own work has to stay at the
 * top or the list stops being a place you can find your work.
 */
export function sortDashboardsForList(
  dashboards: readonly Dashboard.T[],
  currentUserId: string | undefined,
): Dashboard.T[] {
  return [...dashboards].sort((a, b) => {
    const aIsMine = a.ownerId === currentUserId;
    const bIsMine = b.ownerId === currentUserId;
    if (aIsMine !== bIsMine) {
      return aIsMine ? -1 : 1;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}
