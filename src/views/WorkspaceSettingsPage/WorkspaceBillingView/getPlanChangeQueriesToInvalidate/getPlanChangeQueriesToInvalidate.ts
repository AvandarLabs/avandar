import type { QueryKey } from "@avandar/query-hooks";

import { SubscriptionPermissionsClient } from "@/clients/SubscriptionPermissionsClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";

/**
 * Every cached answer a plan change makes wrong: the workspace row the app
 * reads entitlement limits from, and every permission verdict derived from the
 * plan.
 *
 * A stale verdict here outlives the upgrade that fixes it, because the
 * persisted `allowed: false` counts as fresh for the whole default `staleTime`
 * and nothing on the billing screen asks again.
 */
export function getPlanChangeQueriesToInvalidate(): readonly QueryKey[] {
  return [
    WorkspaceClient.QueryKeys.getWorkspacesOfCurrentUser(),
    // By client name, not by key: verdicts are cached per `subscriptionId`,
    // and switching to the native Free plan mints a NEW subscription, so the
    // entry to clear belongs to the subscription being replaced.
    [SubscriptionPermissionsClient.getClientName()],
  ];
}
