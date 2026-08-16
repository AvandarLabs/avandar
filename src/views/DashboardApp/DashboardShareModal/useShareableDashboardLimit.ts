import { countShareableDashboards } from "$/models/Dashboard/Dashboard";
import { Subscription } from "$/models/Subscription/Subscription";
import { ResourceShareClient } from "@/clients/permissions/ResourceShareClient";
import { SubscriptionPermissionsClient } from "@/clients/SubscriptionPermissionsClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

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
 * Whether the plan blocks publishing this dashboard.
 *
 * Returns `isBlocked: false` in the two cases where no allowance is consumed:
 * the target is `draft` (unpublishing is always free, and a workspace that is
 * over its cap must always have a way back under it), and the dashboard
 * ALREADY counts as shareable, since republishing it changes no count. The
 * second is what lets a free workspace keep updating the one dashboard it is
 * entitled to.
 *
 * "Already counts" is answered by `countShareableDashboards`, the same helper
 * the entitlement backend uses, rather than by restating the rule here: the
 * rule is already written twice (TypeScript and the SQL trigger it mirrors)
 * and a third copy would be a third thing to keep in step.
 *
 * The verdict is optimistic while the backend answer is in flight or missing.
 * The database trigger is the real gate, so a slow query must leave the button
 * live rather than disable it on a guess.
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

  // Same query key the share modal itself uses, so this is a cache read rather
  // than a second request, and it stays current as shares are added or
  // revoked in the modal above it.
  const [sharingState] = ResourceShareClient.useGetResourceSharingState({
    workspaceId: workspace.id as WorkspaceId,
    resourceType: "dashboard",
    resourceId: dashboard.id,
  });

  const alreadyCountsAsShareable =
    countShareableDashboards({
      dashboards: [
        {
          id: dashboard.id,
          ownerId: sharingState?.ownerId ?? dashboard.ownerId,
          visibility: dashboard.visibility,
          // The sharing state is the live value: the general-access dropdown
          // writes restriction immediately, while `dashboard` is the row as it
          // was when the modal opened.
          isRestricted: sharingState?.isRestricted ?? dashboard.isRestricted,
        },
      ],
      shares: sharingState?.shares ?? [],
    }) > 0;

  const wouldConsumeAllowance =
    targetVisibility !== "draft" && !alreadyCountsAsShareable;

  const [permission] =
    SubscriptionPermissionsClient.useCanPublishShareableDashboard({
      subscriptionId: subscription?.id ?? "",
      useQueryOptions: {
        enabled: wouldConsumeAllowance && !!subscription?.id,
      },
    });

  return {
    isBlocked: wouldConsumeAllowance && permission?.allowed === false,
    maxAllowed:
      subscription ?
        Subscription.getEffectiveEntitlementLimits(subscription)
          .maxShareableDashboardsAllowed
      : undefined,
    subscription,
  };
}
