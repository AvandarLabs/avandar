import { describe, expect, it } from "vitest";
import { SubscriptionPermissionsClient } from "@/clients/SubscriptionPermissionsClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { getPlanChangeQueriesToInvalidate } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/planChangeQueries";

/**
 * Whether one of the invalidated keys would match `target`, the way
 * `invalidateQueries` matches: a key matches every entry it is a prefix of.
 */
function invalidates(target: readonly unknown[]): boolean {
  return getPlanChangeQueriesToInvalidate().some((queryKey) => {
    return (queryKey as readonly unknown[]).every((segment, index) => {
      return Object.is(segment, target[index]);
    });
  });
}

describe("getPlanChangeQueriesToInvalidate", () => {
  it("drops the workspace row the entitlement limits are read from", () => {
    expect(
      invalidates(WorkspaceClient.QueryKeys.getWorkspacesOfCurrentUser()),
    ).toBe(true);
  });

  // Without this, an upgrade bought inside `ShareableLimitReachedModal` leaves
  // the publish button disabled behind its Upgrade prompt: the persisted
  // `allowed: false` counts as fresh for the whole default `staleTime` and
  // nothing on that screen would ever ask again.
  //
  // Matched by prefix rather than by the exact key because the verdict is
  // cached per subscription id, and switching to the native Free plan mints a
  // NEW subscription: the entry that has to go belongs to the old one.
  it("drops the shareable-dashboard verdict for any subscription", () => {
    expect(
      invalidates(
        SubscriptionPermissionsClient.QueryKeys.canPublishShareableDashboard({
          subscriptionId: "the-subscription-being-replaced",
        }),
      ),
    ).toBe(true);
  });
});
