import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * Orders the dashboards index: yours first, then everything RLS returned,
 * each group newest first.
 *
 * A dashboard shared with you appears in this list too, so your own work has
 * to stay at the top or the list stops being a place you can find your work.
 */
export function sortDashboardsForList(
  options: Readonly<{
    dashboards: readonly Dashboard.T[];
    currentUserId: string | undefined;
  }>,
): Dashboard.T[] {
  const { dashboards, currentUserId } = options;
  return [...dashboards].sort((a, b) => {
    const aIsMine = a.ownerId === currentUserId;
    const bIsMine = b.ownerId === currentUserId;
    if (aIsMine !== bIsMine) {
      return aIsMine ? -1 : 1;
    }
    // Compared as instants rather than as text. `localeCompare` would run ICU
    // collation over what is really an ordered timestamp, and it would rank a
    // non-UTC offset by its digits: the parser accepts one even though
    // PostgREST currently normalises everything to `+00:00`.
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
}
