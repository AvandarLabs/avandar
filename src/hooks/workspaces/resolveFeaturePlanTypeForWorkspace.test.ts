import { describe, expect, it } from "vitest";
import { resolveFeaturePlanTypeForWorkspace } from "@/hooks/workspaces/resolveFeaturePlanTypeForWorkspace";
import type { UUID } from "@utils/types/common.types";
import type { SubscriptionRead } from "$/models/Subscription/Subscription.types";

function _subscription(
  overrides: Partial<SubscriptionRead> = {},
): SubscriptionRead {
  return {
    id: "00000000-0000-4000-8000-000000000001" as SubscriptionRead["id"],
    workspaceId: "00000000-0000-4000-8000-000000000002" as UUID<"Workspace">,
    subscriptionOwnerId:
      "00000000-0000-4000-8000-000000000003" as SubscriptionRead["subscriptionOwnerId"],
    createdAt: new Date(),
    updatedAt: new Date(),
    polarSubscriptionId: undefined,
    polarProductId: undefined,
    polarCustomerEmail: undefined,
    polarCustomerId: undefined,
    featurePlanType: "basic",
    subscriptionStatus: "active",
    maxSeatsAllowed: 1,
    maxDatasetsAllowed: 1,
    maxDashboardsAllowed: 1,
    maxShareableDashboardsAllowed: 0,
    startedAt: new Date(),
    endsAt: undefined,
    endedAt: undefined,
    currentPeriodStart: new Date(),
    currentPeriodEnd: undefined,
    ...overrides,
  };
}

describe("resolveFeaturePlanTypeForWorkspace", () => {
  it("returns no_subscription when row is missing", () => {
    expect(
      resolveFeaturePlanTypeForWorkspace({ subscription: undefined }),
    ).toEqual({ type: "no_subscription" });
  });

  it("returns free when subscription is canceled", () => {
    expect(
      resolveFeaturePlanTypeForWorkspace({
        subscription: _subscription({
          featurePlanType: "basic",
          subscriptionStatus: "canceled",
        }),
      }),
    ).toEqual({ type: "plan", featurePlanType: "free" });
  });

  it("returns the subscribed plan when active", () => {
    expect(
      resolveFeaturePlanTypeForWorkspace({
        subscription: _subscription({
          featurePlanType: "premium",
          subscriptionStatus: "active",
        }),
      }),
    ).toEqual({ type: "plan", featurePlanType: "premium" });
  });
});
