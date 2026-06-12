import { BasicPlanConfig, FreePlanConfig } from "$/config/FeaturePlansConfig";
import { describe, expect, it } from "vitest";
import { getBillingActionFromSelectedPlan } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/getBillingActionFromSelectedPlan";
import type { SubscriptionPlan } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";
import type { UUID } from "@utils/types/common.types";
import type { SubscriptionRead } from "$/models/Subscription/Subscription.types";

const FREE_PLAN: SubscriptionPlan = {
  priceType: "free",
  polarProductId: "free-product-id",
  isArchived: false,
  description: "",
  planFullName: "Avandar Free",
  featurePlan: {
    type: "free",
    metadata: FreePlanConfig,
  },
};

const STARTER_PLAN: SubscriptionPlan = {
  priceType: "seat_based",
  polarProductId: "starter-product-id",
  planInterval: "year",
  isArchived: false,
  description: "",
  planFullName: "Avandar Starter (Annual)",
  pricePerSeat: 12_000,
  normalizedPricePerSeatPerMonth: 10,
  priceCurrency: "usd",
  featurePlan: {
    type: "basic",
    metadata: BasicPlanConfig,
  },
};

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

describe("getBillingActionFromSelectedPlan", () => {
  it("creates native free for new workspaces", () => {
    expect(
      getBillingActionFromSelectedPlan({
        currentSubscription: undefined,
        currentSubscribedPlan: undefined,
        selectedPlan: FREE_PLAN,
      }),
    ).toEqual({ type: "create_native_free" });
  });

  it("routes paid subscribers selecting free to change plan confirmation", () => {
    const currentSubscription = _subscription({
      featurePlanType: "basic",
      subscriptionStatus: "active",
      polarSubscriptionId:
        "00000000-0000-4000-8000-000000000010" as SubscriptionRead["polarSubscriptionId"],
      polarProductId:
        "starter-product-id" as SubscriptionRead["polarProductId"],
    });

    expect(
      getBillingActionFromSelectedPlan({
        currentSubscription,
        currentSubscribedPlan: STARTER_PLAN,
        selectedPlan: FREE_PLAN,
      }),
    ).toEqual({ type: "change_plan" });
  });

  it("creates native free when the existing row is canceled", () => {
    expect(
      getBillingActionFromSelectedPlan({
        currentSubscription: _subscription({
          subscriptionStatus: "canceled",
          polarSubscriptionId:
            "00000000-0000-4000-8000-000000000010" as SubscriptionRead["polarSubscriptionId"],
        }),
        currentSubscribedPlan: STARTER_PLAN,
        selectedPlan: FREE_PLAN,
      }),
    ).toEqual({ type: "create_native_free" });
  });

  it("returns billing_error for inconsistent paid rows without Polar id", () => {
    expect(
      getBillingActionFromSelectedPlan({
        currentSubscription: _subscription({
          featurePlanType: "basic",
          subscriptionStatus: "active",
        }),
        currentSubscribedPlan: STARTER_PLAN,
        selectedPlan: STARTER_PLAN,
      }),
    ).toEqual({ type: "billing_error" });
  });

  it("uses polar checkout for paid upgrades from native free", () => {
    expect(
      getBillingActionFromSelectedPlan({
        currentSubscription: _subscription(),
        currentSubscribedPlan: FREE_PLAN,
        selectedPlan: STARTER_PLAN,
      }),
    ).toEqual({ type: "polar_checkout" });
  });
});
