import type {
  SubscriptionId,
  SubscriptionRead,
} from "$/models/Subscription/Subscription.types.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types.ts";

import { describe, expect, it } from "vitest";

import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule.ts";

function _subscription(
  overrides: Partial<SubscriptionRead> = {},
): SubscriptionRead {
  return {
    id: "00000000-0000-4000-8000-000000000001" as SubscriptionId,
    workspaceId: "00000000-0000-4000-8000-000000000002" as WorkspaceId,
    subscriptionOwnerId: "00000000-0000-4000-8000-000000000003" as UserId,
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

describe("SubscriptionModule billing lifecycle", () => {
  it("detects native free subscriptions", () => {
    expect(
      SubscriptionModule.isNativeFreeSubscription(
        _subscription({
          featurePlanType: "free",
          polarSubscriptionId: undefined,
        }),
      ),
    ).toBe(true);

    expect(
      SubscriptionModule.isNativeFreeSubscription(
        _subscription({
          featurePlanType: "basic",
          polarSubscriptionId:
            "00000000-0000-4000-8000-000000000010" as SubscriptionRead["polarSubscriptionId"],
        }),
      ),
    ).toBe(false);
  });

  it("allows create-free when there is no subscription or it is canceled", () => {
    expect(
      SubscriptionModule.shouldCreateNativeFreeSubscription(undefined),
    ).toBe(true);

    expect(
      SubscriptionModule.shouldCreateNativeFreeSubscription(
        _subscription({ subscriptionStatus: "canceled" }),
      ),
    ).toBe(true);

    expect(
      SubscriptionModule.shouldCreateNativeFreeSubscription(
        _subscription({ subscriptionStatus: "active" }),
      ),
    ).toBe(false);

    expect(
      SubscriptionModule.shouldCreateNativeFreeSubscription(
        _subscription({
          subscriptionStatus: "active",
          featurePlanType: "basic",
          polarSubscriptionId:
            "00000000-0000-4000-8000-000000000010" as SubscriptionRead["polarSubscriptionId"],
        }),
      ),
    ).toBe(false);
  });

  it("allows Polar merge onto native free or canceled rows", () => {
    expect(
      SubscriptionModule.canPolarCheckoutMergeOntoExistingRow({
        polar_subscription_id: null,
        subscription_status: "active",
      }),
    ).toBe(true);

    expect(
      SubscriptionModule.canPolarCheckoutMergeOntoExistingRow({
        polar_subscription_id: "polar-sub-id",
        subscription_status: "canceled",
      }),
    ).toBe(true);

    expect(
      SubscriptionModule.canPolarCheckoutMergeOntoExistingRow({
        polar_subscription_id: "polar-sub-id",
        subscription_status: "active",
      }),
    ).toBe(false);
  });

  it("builds native free DB fields with null Polar columns", () => {
    const fields = SubscriptionModule.buildNativeFreeFieldsForDB({
      workspaceId: "00000000-0000-4000-8000-000000000002" as WorkspaceId,
      subscriptionOwnerId:
        "00000000-0000-4000-8000-000000000003" as SubscriptionRead["subscriptionOwnerId"],
      startedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(fields.feature_plan_type).toBe("free");
    expect(fields.polar_subscription_id).toBeNull();
    expect(fields.polar_product_id).toBeNull();
    expect(fields.started_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("treats only active and trialing statuses as entitled", () => {
    expect(SubscriptionModule.doesSubscriptionGrantEntitlements("active")).toBe(
      true,
    );
    expect(
      SubscriptionModule.doesSubscriptionGrantEntitlements("trialing"),
    ).toBe(true);
    expect(
      SubscriptionModule.doesSubscriptionGrantEntitlements("canceled"),
    ).toBe(false);
    expect(
      SubscriptionModule.doesSubscriptionGrantEntitlements(undefined),
    ).toBe(false);
    expect(
      SubscriptionModule.doesSubscriptionGrantEntitlements(
        _subscription({ subscriptionStatus: "active" }),
      ),
    ).toBe(true);
  });

  it("prompts billing setup when subscription is missing or inactive", () => {
    expect(SubscriptionModule.shouldPromptForBillingSetup(undefined)).toBe(
      true,
    );
    expect(
      SubscriptionModule.shouldPromptForBillingSetup(
        _subscription({ subscriptionStatus: "canceled" }),
      ),
    ).toBe(true);
    expect(
      SubscriptionModule.shouldPromptForBillingSetup(
        _subscription({ subscriptionStatus: "active" }),
      ),
    ).toBe(false);
  });

  it("applies free-tier limits when subscription entitlements are inactive", () => {
    const canceledPaid = _subscription({
      subscriptionStatus: "canceled",
      featurePlanType: "basic",
      maxSeatsAllowed: 10,
      maxDatasetsAllowed: 100,
    });

    expect(
      SubscriptionModule.getEffectiveEntitlementLimits(canceledPaid),
    ).toEqual({
      maxSeatsAllowed: 2,
      maxDatasetsAllowed: 5,
      maxShareableDashboardsAllowed: 1,
    });

    expect(
      SubscriptionModule.canInviteMembers({
        subscription: canceledPaid,
        numMembersInWorkspace: 2,
      }),
    ).toBe(false);
  });
});

describe("SubscriptionModule.resolveFeaturePlanTypeForWorkspace", () => {
  it("returns no_subscription when row is missing", () => {
    expect(
      SubscriptionModule.resolveFeaturePlanTypeForWorkspace({
        subscription: undefined,
      }),
    ).toEqual({ type: "no_subscription" });
  });

  it("returns free when subscription is canceled", () => {
    expect(
      SubscriptionModule.resolveFeaturePlanTypeForWorkspace({
        subscription: _subscription({
          featurePlanType: "basic",
          subscriptionStatus: "canceled",
        }),
      }),
    ).toEqual({ type: "plan", featurePlanType: "free" });
  });

  it("returns the subscribed plan when active", () => {
    expect(
      SubscriptionModule.resolveFeaturePlanTypeForWorkspace({
        subscription: _subscription({
          featurePlanType: "premium",
          subscriptionStatus: "active",
        }),
      }),
    ).toEqual({ type: "plan", featurePlanType: "premium" });
  });
});

describe("SubscriptionModule subscription permission access", () => {
  it("allows permission queries for workspace members when subscription exists", () => {
    expect(
      SubscriptionModule.canQuerySubscriptionPermission({
        subscriptionFound: true,
        isWorkspaceMember: true,
      }),
    ).toBe(true);
  });

  it("denies permission queries for non-members (no UUID probing)", () => {
    expect(
      SubscriptionModule.canQuerySubscriptionPermission({
        subscriptionFound: true,
        isWorkspaceMember: false,
      }),
    ).toBe(false);
  });

  it("denies permission queries when subscription is unknown", () => {
    expect(
      SubscriptionModule.canQuerySubscriptionPermission({
        subscriptionFound: false,
        isWorkspaceMember: true,
      }),
    ).toBe(false);

    expect(
      SubscriptionModule.canQuerySubscriptionPermission({
        subscriptionFound: false,
        isWorkspaceMember: false,
      }),
    ).toBe(false);
  });
});

describe("canPublishShareableDashboard", () => {
  it("allows the first shareable dashboard on the free plan", () => {
    expect(
      SubscriptionModule.canPublishShareableDashboard({
        subscription: _subscription({
          subscriptionStatus: "active",
          maxShareableDashboardsAllowed: 1,
        }),
        numShareableDashboardsInWorkspace: 0,
      }),
    ).toBe(true);
  });

  it("refuses the second", () => {
    expect(
      SubscriptionModule.canPublishShareableDashboard({
        subscription: _subscription({
          subscriptionStatus: "active",
          maxShareableDashboardsAllowed: 1,
        }),
        numShareableDashboardsInWorkspace: 1,
      }),
    ).toBe(false);
  });

  it("treats an undefined limit as unlimited", () => {
    expect(
      SubscriptionModule.canPublishShareableDashboard({
        subscription: _subscription({
          subscriptionStatus: "active",
          maxShareableDashboardsAllowed: undefined,
        }),
        numShareableDashboardsInWorkspace: 99,
      }),
    ).toBe(true);
  });

  it("collapses a lapsed paid subscription to the free limit", () => {
    // The stored column still says unlimited; the status is what decides.
    expect(
      SubscriptionModule.canPublishShareableDashboard({
        subscription: _subscription({
          subscriptionStatus: "canceled",
          maxShareableDashboardsAllowed: undefined,
        }),
        numShareableDashboardsInWorkspace: 1,
      }),
    ).toBe(false);
  });

  it("refuses when there is no subscription at all", () => {
    expect(
      SubscriptionModule.canPublishShareableDashboard({
        subscription: undefined,
        numShareableDashboardsInWorkspace: 0,
      }),
    ).toBe(false);
  });
});
