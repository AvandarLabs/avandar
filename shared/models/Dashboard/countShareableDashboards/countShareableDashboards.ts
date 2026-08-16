import type { DashboardVisibility } from "$/models/Dashboard/Dashboard.types.ts";

/** The minimum a dashboard row must carry for the count to judge it. */
type ShareableDashboardCandidate = Readonly<{
  id: string;
  ownerId: string;
  visibility: DashboardVisibility;
  isRestricted: boolean;
}>;

/** The minimum a `resource_shares` row must carry for the count to judge it. */
type ShareableDashboardShare = Readonly<{
  resourceId: string;
  principalType: string;
  principalId: string | null;
}>;

/**
 * How many of the given dashboards count against
 * `subscriptions.max_shareable_dashboards_allowed`.
 *
 * A dashboard counts when somebody other than its owner can reach it:
 *
 *   draft                        -> no, nobody outside its editors can open it
 *   workspace + private to owner -> no, every non-owner share was revoked
 *   workspace + shared           -> yes
 *   public                       -> yes, ALWAYS
 *
 * The unconditional `public` arm is load-bearing. A public dashboard is
 * world-readable through the anon policy regardless of its share rows, so
 * letting `is_restricted` hide it from the count would let a free workspace
 * publish unlimited dashboards to the open internet.
 *
 * This exists as a pure function, rather than inline in the edge function that
 * needs it, because it is one half of a rule that is written twice: Postgres
 * cannot call TypeScript, so `public.util__dashboard_counts_as_shareable` in
 * `supabase/schemas/18.entitlements.dashboards.sql` states the same rule in
 * SQL. Nothing type-checks, lints or runs `supabase/functions`, so logic left
 * there is unpinned and free to drift away from the SQL. Living here it is
 * pinned by vitest, the mirror of the pgTAP coverage on the SQL side. Change
 * one and you must change the other.
 *
 * @param options.dashboards Every non-draft dashboard is enough; drafts are
 *   accepted and ignored, so the caller may pass a whole workspace.
 * @param options.shares Share rows for those dashboards. A row whose
 *   `principalType` is `user` and whose `principalId` is the dashboard's own
 *   owner does not make the dashboard shared, matching
 *   `public.util__has_non_owner_share`.
 * @returns The number of dashboards reachable by somebody other than their
 *   owner.
 */
export function countShareableDashboards(
  options: Readonly<{
    dashboards: readonly ShareableDashboardCandidate[];
    shares: readonly ShareableDashboardShare[];
  }>,
): number {
  const { dashboards, shares } = options;

  const ownerIdByDashboardId = new Map(
    dashboards.map((dashboard) => {
      return [dashboard.id, dashboard.ownerId];
    }),
  );

  // A share only lifts a dashboard out of "private to its owner" when it names
  // somebody else. `resource_shares` can hold a row naming the owner (nothing
  // in the schema forbids it), and the SQL side drops those, so we must too.
  const nonOwnerSharedIds = new Set(
    shares
      .filter((share) => {
        return (
          share.principalType !== "user" ||
          share.principalId !== ownerIdByDashboardId.get(share.resourceId)
        );
      })
      .map((share) => {
        return share.resourceId;
      }),
  );

  return dashboards.filter((dashboard) => {
    if (dashboard.visibility === "public") {
      return true;
    }
    if (dashboard.visibility !== "workspace") {
      return false;
    }
    return !dashboard.isRestricted || nonOwnerSharedIds.has(dashboard.id);
  }).length;
}
