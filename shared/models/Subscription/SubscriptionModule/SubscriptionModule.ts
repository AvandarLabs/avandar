import { registry } from "@utils/objects/registry/registry.ts";
import {
  BasicPlanLimitsConfig,
  FreePlanLimitsConfig,
  PremiumPlanLimitsConfig,
} from "$/config/FeaturePlansConfig.ts";
import type {
  FeaturePlanType,
  PolarCustomerId,
  PolarProductId,
  ResolvedFeaturePlanType,
  SubscriptionId,
  SubscriptionPermission,
  SubscriptionPolarId,
  SubscriptionRead,
  SubscriptionStatus,
} from "$/models/Subscription/Subscription.types.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Tables, TablesInsert } from "$/types/database.types.ts";

export const SubscriptionModule = {
  FeaturePlanTypes: registry<FeaturePlanType>().keys(
    "free",
    "basic",
    "premium",
  ),
  Statuses: registry<SubscriptionStatus>().keys(
    "incomplete",
    "incomplete_expired",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
  ),
  Permissions: registry<SubscriptionPermission>().keys(
    "can_add_datasets",
    "can_invite_users",
  ),

  /**
   * Whether the caller may receive a subscription permission result.
   * Unknown subscriptions and non-members always get false (no probing).
   */
  canQuerySubscriptionPermission: (options: {
    subscriptionFound: boolean;
    isWorkspaceMember: boolean;
  }): boolean => {
    if (!options.subscriptionFound || !options.isWorkspaceMember) {
      return false;
    }
    return true;
  },

  /**
   * Whether this subscription state grants the workspace its plan
   * entitlements.
   *
   * "Entitlements" is the SaaS-billing term for the features and numeric
   * caps a subscription unlocks. In our `subscriptions` row those caps
   * live in `max_seats_allowed`, `max_datasets_allowed`,
   * `max_dashboards_allowed`, and `max_shareable_dashboards_allowed`;
   * the `feature_plan_type` enum is just the human label they map to.
   * This predicate decides whether those stored caps actually apply
   * (`active`/`trialing`) or whether the workspace should be treated as
   * `free` regardless of the row's label (every other status).
   *
   * Accepts a raw status, the full subscription row, or `undefined`
   * (no subscription yet → no entitlements).
   */
  doesSubscriptionGrantEntitlements: (
    input:
      | SubscriptionStatus
      | Pick<SubscriptionRead, "subscriptionStatus">
      | undefined,
  ): boolean => {
    if (input === undefined) {
      return false;
    }
    const status = typeof input === "string" ? input : input.subscriptionStatus;
    return status === "active" || status === "trialing";
  },

  /**
   * Whether the workspace still needs billing onboarding (no row or inactive).
   */
  shouldPromptForBillingSetup: (
    subscription: SubscriptionRead | undefined,
  ): boolean => {
    return !SubscriptionModule.doesSubscriptionGrantEntitlements(subscription);
  },

  /**
   * Resolves the workspace's effective feature plan. Returns
   * `no_subscription` when the row is missing (UI should redirect), and
   * collapses inactive/canceled paid rows to `free` so feature gates stay
   * conservative when entitlements lapse.
   */
  resolveFeaturePlanTypeForWorkspace: (options: {
    subscription: SubscriptionRead | undefined;
  }): ResolvedFeaturePlanType => {
    const { subscription } = options;
    if (subscription === undefined) {
      return { type: "no_subscription" };
    }
    if (!SubscriptionModule.doesSubscriptionGrantEntitlements(subscription)) {
      return { type: "plan", featurePlanType: "free" };
    }
    return { type: "plan", featurePlanType: subscription.featurePlanType };
  },

  /**
   * Limits applied for permission checks (free tier when inactive).
   */
  getEffectiveEntitlementLimits: (
    subscription: SubscriptionRead,
  ): {
    maxSeatsAllowed: number;
    maxDatasetsAllowed: number | undefined;
  } => {
    if (SubscriptionModule.doesSubscriptionGrantEntitlements(subscription)) {
      return {
        maxSeatsAllowed: subscription.maxSeatsAllowed,
        maxDatasetsAllowed: subscription.maxDatasetsAllowed,
      };
    }

    return {
      maxSeatsAllowed: FreePlanLimitsConfig.maxSeatsAllowed,
      maxDatasetsAllowed: FreePlanLimitsConfig.maxDatasetsAllowed,
    };
  },

  /**
   * Whether a subscription row is a native free subscription (no Polar).
   */
  isNativeFreeSubscription: (
    subscription: Pick<
      SubscriptionRead,
      "polarSubscriptionId" | "featurePlanType"
    >,
  ): boolean => {
    return (
      subscription.polarSubscriptionId === undefined &&
      subscription.featurePlanType === "free"
    );
  },

  /**
   * Whether create-free should run for this workspace subscription state.
   */
  shouldCreateNativeFreeSubscription: (
    subscription:
      | Pick<
          SubscriptionRead,
          "polarSubscriptionId" | "featurePlanType" | "subscriptionStatus"
        >
      | undefined,
  ): boolean => {
    return (
      subscription === undefined ||
      subscription.subscriptionStatus === "canceled"
    );
  },

  /**
   * Whether Polar checkout/sync may merge onto an existing subscription row.
   */
  canPolarCheckoutMergeOntoExistingRow: (
    row: Pick<
      Tables<"subscriptions">,
      "polar_subscription_id" | "subscription_status"
    >,
  ): boolean => {
    return (
      row.polar_subscription_id === null ||
      row.subscription_status === "canceled"
    );
  },

  /**
   * DB fields for insert/update when creating a native free subscription.
   *
   * Lives on `SubscriptionModule` (not `SubscriptionParsers`) because this
   * function is called from Supabase edge functions running on Deno, and
   * `SubscriptionParsers` still imports from src/ paths that are not
   * Deno-compatible. Keep this Deno-safe: depend only on
   * `FeaturePlansConfig`, `database.types`, and pure helpers.
   */
  buildNativeFreeFieldsForDB: (options: {
    workspaceId: SubscriptionRead["workspaceId"];
    subscriptionOwnerId: UserId;
    startedAt?: string;
  }): Omit<
    TablesInsert<"subscriptions">,
    "id" | "created_at" | "updated_at"
  > => {
    const startedAt = options.startedAt ?? new Date().toISOString();

    return {
      workspace_id: options.workspaceId,
      subscription_owner_id: options.subscriptionOwnerId,
      feature_plan_type: "free",
      subscription_status: "active",
      started_at: startedAt,
      current_period_start: startedAt,
      current_period_end: null,
      ends_at: null,
      ended_at: null,
      polar_subscription_id: null,
      polar_customer_id: null,
      polar_customer_email: null,
      polar_product_id: null,
      ...SubscriptionModule.computeSubscriptionLimitsForDB({
        featurePlan: "free",
        numSeats: 1,
      }),
    };
  },

  /**
   * Checks if the subscription allows the user to add more datasets.
   * @param options.subscription - The subscription to check.
   * @param options.numDatasetsInWorkspace - The number of datasets in the
   *   workspace.
   * @returns True if the subscription allows the user to add more datasets.
   */
  canAddDatasets: ({
    subscription,
    numDatasetsInWorkspace,
  }: {
    subscription: SubscriptionRead | undefined;
    numDatasetsInWorkspace: number;
  }): boolean => {
    if (subscription) {
      const { maxDatasetsAllowed } =
        SubscriptionModule.getEffectiveEntitlementLimits(subscription);
      return (
        maxDatasetsAllowed === undefined ||
        numDatasetsInWorkspace < maxDatasetsAllowed
      );
    }
    return false;
  },

  /**
   * Checks if the subscription allows the user to invite more members.
   * @param options.subscription - The subscription to check.
   * @param options.numMembersInWorkspace - The number of members in the
   *   workspace.
   * @returns True if the subscription allows the user to invite more members.
   */
  canInviteMembers: ({
    subscription,
    numMembersInWorkspace,
  }: {
    subscription: SubscriptionRead | undefined;
    numMembersInWorkspace: number;
  }): boolean => {
    if (subscription) {
      const { maxSeatsAllowed } =
        SubscriptionModule.getEffectiveEntitlementLimits(subscription);
      return numMembersInWorkspace < maxSeatsAllowed;
    }
    return false;
  },

  /**
   * Returns used, max, and remaining seat counts for billing UI. Returns
   * `undefined` for `maxSeats` / `remainingSeats` when no subscription row
   * exists yet.
   */
  getSeatInfo: ({
    subscription,
    numMembersInWorkspace,
  }: {
    subscription: SubscriptionRead | undefined;
    numMembersInWorkspace: number;
  }): {
    usedSeats: number;
    maxSeats: number | undefined;
    remainingSeats: number | undefined;
  } => {
    const maxSeats = subscription?.maxSeatsAllowed;
    const remainingSeats =
      maxSeats != null ? maxSeats - numMembersInWorkspace : undefined;
    return {
      usedSeats: numMembersInWorkspace,
      maxSeats,
      remainingSeats,
    };
  },

  /**
   * Computes the four subscription limit columns to store in the
   * `subscriptions` table. Returns DB-column-name keys so the result can be
   * spread directly into a Supabase insert/update/upsert object.
   *
   * @param options.featurePlan - "free" | "basic" | "premium"
   * @param options.numSeats - Number of purchased seats (>= 1)
   */
  computeSubscriptionLimitsForDB: ({
    featurePlan,
    numSeats,
  }: {
    featurePlan: FeaturePlanType;
    numSeats: number;
  }): {
    max_seats_allowed: number;
    max_datasets_allowed: number | null;
    max_dashboards_allowed: number | null;
    max_shareable_dashboards_allowed: number | null;
  } => {
    if (featurePlan === "free") {
      return {
        max_seats_allowed: FreePlanLimitsConfig.maxSeatsAllowed,
        max_datasets_allowed: FreePlanLimitsConfig.maxDatasetsAllowed,
        max_dashboards_allowed: FreePlanLimitsConfig.maxDashboardsAllowed,
        max_shareable_dashboards_allowed:
          FreePlanLimitsConfig.maxShareableDashboardsAllowed,
      };
    }

    const limitsConfig =
      featurePlan === "basic" ? BasicPlanLimitsConfig : PremiumPlanLimitsConfig;
    const additionalSeats = numSeats - 1;

    return {
      max_seats_allowed: numSeats,
      max_datasets_allowed:
        limitsConfig.maxDatasetsBase +
        additionalSeats * limitsConfig.datasetsPerAdditionalSeat,
      max_dashboards_allowed: limitsConfig.maxDashboardsAllowed,
      max_shareable_dashboards_allowed:
        limitsConfig.maxShareableDashboardsAllowed,
    };
  },

  /**
   * Maps a `subscriptions` DB row to a SubscriptionRead model (edge-safe).
   * Right now, SubscriptionParsers still imports functions from src/ which is
   * not deno-compatible. Once SubscriptionParsers only imports filed from
   * deno-compatible paths, we can stop using this function in Supabase
   * edge functions and instead just call the SubscriptionParsers directly.
   */
  fromDbRowToRead: (row: Tables<"subscriptions">): SubscriptionRead => {
    return {
      id: row.id as SubscriptionId,
      workspaceId: row.workspace_id as SubscriptionRead["workspaceId"],
      subscriptionOwnerId: row.subscription_owner_id as UserId,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      polarSubscriptionId:
        row.polar_subscription_id != null ?
          (row.polar_subscription_id as SubscriptionPolarId)
        : undefined,
      polarProductId:
        row.polar_product_id != null ?
          (row.polar_product_id as PolarProductId)
        : undefined,
      polarCustomerEmail: row.polar_customer_email ?? undefined,
      polarCustomerId:
        row.polar_customer_id != null ?
          (row.polar_customer_id as PolarCustomerId)
        : undefined,
      featurePlanType: row.feature_plan_type,
      subscriptionStatus: row.subscription_status,
      maxSeatsAllowed: row.max_seats_allowed,
      maxDatasetsAllowed: row.max_datasets_allowed ?? undefined,
      maxDashboardsAllowed: row.max_dashboards_allowed ?? undefined,
      maxShareableDashboardsAllowed:
        row.max_shareable_dashboards_allowed ?? undefined,
      startedAt: row.started_at != null ? new Date(row.started_at) : undefined,
      endsAt: row.ends_at != null ? new Date(row.ends_at) : undefined,
      endedAt: row.ended_at != null ? new Date(row.ended_at) : undefined,
      currentPeriodStart:
        row.current_period_start != null ?
          new Date(row.current_period_start)
        : undefined,
      currentPeriodEnd:
        row.current_period_end != null ?
          new Date(row.current_period_end)
        : undefined,
    };
  },
};
