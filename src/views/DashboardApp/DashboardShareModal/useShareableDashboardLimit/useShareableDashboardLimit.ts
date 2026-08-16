import { countShareableDashboards } from "$/models/Dashboard/Dashboard";
import { Subscription } from "$/models/Subscription/Subscription";
import { ResourceShareClient } from "@/clients/permissions/ResourceShareClient";
import { SubscriptionPermissionsClient } from "@/clients/SubscriptionPermissionsClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ResourceSharingState } from "@/clients/permissions/ResourceShareClient";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * The plan's verdict on making one more dashboard shareable, plus the numbers
 * the upgrade prompt needs to explain it.
 */
export type ShareableDashboardLimit = {
  /** Whether the plan refuses to let this publish go through. */
  isBlocked: boolean;
  /**
   * How many dashboards the plan lets the workspace make shareable, or
   * `undefined` for an unlimited plan (and while no subscription is known).
   */
  maxAllowed: number | undefined;
  /** The workspace's subscription, so the upgrade modal can name the plan. */
  subscription: Subscription.T | undefined;
};

/**
 * Whether this dashboard ALREADY counts against the allowance, in which case
 * republishing it consumes nothing.
 *
 * Answered by `countShareableDashboards`, the same helper the entitlement
 * backend uses, rather than by restating the rule here: the rule is already
 * written twice (TypeScript and the SQL trigger it mirrors) and a third copy
 * would be a third thing to keep in step.
 *
 * @param options.sharingState The live share rows, preferred over the
 *   `dashboard` row wherever both carry the same field: the general-access
 *   dropdown writes restriction immediately, while `dashboard` is the row as
 *   it was when the modal opened.
 */
function _getAlreadyCountsAsShareable(
  options: Readonly<{
    dashboard: Dashboard.T;
    sharingState: ResourceSharingState | undefined;
  }>,
): boolean {
  const { dashboard, sharingState } = options;
  return (
    countShareableDashboards({
      dashboards: [
        {
          id: dashboard.id,
          ownerId: sharingState?.ownerId ?? dashboard.ownerId,
          visibility: dashboard.visibility,
          isRestricted: sharingState?.isRestricted ?? dashboard.isRestricted,
        },
      ],
      shares: sharingState?.shares ?? [],
    }) > 0
  );
}

/**
 * Whether the plan blocks publishing this dashboard.
 *
 * Returns `isBlocked: false` in the two cases where no allowance is consumed:
 * the target is `draft` (unpublishing is always free, and a workspace that is
 * over its cap must always have a way back under it), and the dashboard
 * ALREADY counts as shareable, since republishing it changes no count. The
 * second is what lets a free workspace keep updating the one dashboard it is
 * entitled to.
 *
 * The verdict is optimistic while EITHER backend answer is in flight or
 * missing: the share rows the exemption is computed from, and the plan verdict
 * itself. The database trigger is the real gate, so a slow query must leave
 * the button live rather than disable it on a guess.
 */
export function useShareableDashboardLimit(
  options: Readonly<{
    dashboard: Dashboard.T;
    targetVisibility: Dashboard.Visibility;
  }>,
): ShareableDashboardLimit {
  const { dashboard, targetVisibility } = options;
  const workspace = useCurrentWorkspace();
  const subscription = workspace.subscription;

  // Same query key and same options the share modal itself uses, so this is a
  // cache read rather than a second request, and it stays current as shares
  // are added or revoked in the modal above it.
  //
  // `ALWAYS_REFETCH_ON_MOUNT` because the cache is persisted to IndexedDB and
  // the persister throttles its writes: a reload right after a share write can
  // restore the PRE-mutation rows, which count as fresh for the whole default
  // `staleTime`. Reading those would answer "already shareable" for a
  // dashboard whose last non-owner share has just been revoked.
  const [sharingState, , sharingStateQuery] =
    ResourceShareClient.useGetResourceSharingState({
      workspaceId: workspace.id as Workspace.Id,
      resourceType: "dashboard",
      resourceId: dashboard.id,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });

  const wouldConsumeAllowance =
    targetVisibility !== "draft" &&
    !_getAlreadyCountsAsShareable({ dashboard, sharingState });

  const [permission] =
    SubscriptionPermissionsClient.useCanPublishShareableDashboard({
      subscriptionId: subscription?.id ?? "",
      useQueryOptions: {
        // Without this, a persisted `allowed: false` outlives the upgrade the
        // user just bought in `ShareableLimitReachedModal`: the entry stays
        // fresh for the whole default `staleTime`, so the publish button keeps
        // its Upgrade prompt with nothing on screen able to refresh it. The
        // plan change also drops this key (see `planChangeQueries`); this
        // covers the reload that happens before that invalidation is
        // persisted.
        ...ALWAYS_REFETCH_ON_MOUNT,
        enabled: wouldConsumeAllowance && !!subscription?.id,
      },
    });

  return {
    // Optimistic while the share rows are in flight, for the same reason the
    // permission answer is: the exemption is computed FROM those rows, so
    // blocking on a snapshot that is about to be replaced would put an Upgrade
    // prompt on a dashboard that turns out to need no allowance at all. The
    // database trigger is the real gate.
    isBlocked:
      !sharingStateQuery.isFetching &&
      wouldConsumeAllowance &&
      permission?.allowed === false,
    maxAllowed:
      subscription ?
        Subscription.getEffectiveEntitlementLimits(subscription)
          .maxShareableDashboardsAllowed
      : undefined,
    subscription,
  };
}
