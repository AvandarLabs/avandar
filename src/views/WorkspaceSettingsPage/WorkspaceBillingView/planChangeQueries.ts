import { SubscriptionPermissionsClient } from "@/clients/SubscriptionPermissionsClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import type { QueryKey } from "@avandar/query-hooks";

/**
 * Every cached answer a plan change makes wrong.
 *
 * The workspace row carries the subscription the app reads its entitlement
 * limits from, and every verdict `SubscriptionPermissionsClient` caches is
 * derived from the plan, so both have to go.
 *
 * The permission verdicts are dropped by client name rather than by their own
 * keys: they are cached per `subscriptionId`, and switching to the native Free
 * plan mints a NEW subscription, so the entry that must be cleared belongs to
 * the subscription being replaced rather than to the one the caller now holds.
 *
 * Without this, someone who reaches the shareable-dashboard limit and upgrades
 * inside `ShareableLimitReachedModal` is left looking at a publish button that
 * is still disabled behind an Upgrade prompt: the persisted `allowed: false`
 * counts as fresh for the whole default `staleTime`, and nothing on that
 * screen would ever ask again.
 *
 * A function rather than a constant so the query keys are built when a
 * mutation is wired up, not while this module is first evaluated.
 */
export function getPlanChangeQueriesToInvalidate(): readonly QueryKey[] {
  return [
    WorkspaceClient.QueryKeys.getWorkspacesOfCurrentUser(),
    [SubscriptionPermissionsClient.getClientName()],
  ];
}
