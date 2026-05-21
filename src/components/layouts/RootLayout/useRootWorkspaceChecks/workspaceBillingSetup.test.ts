import { describe, expect, it } from "vitest";
import {
  shouldCloseBillingSetupModal,
  shouldOpenBillingSetupModal,
} from "@/components/layouts/RootLayout/useRootWorkspaceChecks/workspaceBillingSetup";
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
    featurePlanType: "free",
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

describe("workspaceBillingSetup", () => {
  it("opens billing modal when there is no subscription", () => {
    expect(
      shouldOpenBillingSetupModal({
        subscription: undefined,
        isInCheckoutRoute: false,
      }),
    ).toBe(true);
  });

  it("opens billing modal when subscription is canceled", () => {
    expect(
      shouldOpenBillingSetupModal({
        subscription: _subscription({ subscriptionStatus: "canceled" }),
        isInCheckoutRoute: false,
      }),
    ).toBe(true);
  });

  it("does not open billing modal on checkout route", () => {
    expect(
      shouldOpenBillingSetupModal({
        subscription: undefined,
        isInCheckoutRoute: true,
      }),
    ).toBe(false);
  });

  it("closes billing modal when subscription is active", () => {
    expect(
      shouldCloseBillingSetupModal({
        subscription: _subscription({ subscriptionStatus: "active" }),
      }),
    ).toBe(true);
  });
});
