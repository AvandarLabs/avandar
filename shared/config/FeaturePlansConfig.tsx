// TODO(jpsyx): Eventually this should not exist hardcoded here. This data
// should be managed externally in Supabase.
type FeaturePlan = "free" | "basic" | "premium";

type PlanConfig = {
  featurePlan: FeaturePlan;
  featurePlanName: string;
  features: readonly string[];
  isRecommendedPlan: boolean;
};

export const FreePlanConfig = {
  featurePlan: "free",
  featurePlanName: "Avandar Free",
  features: [
    "You can invite 1 additional team member into your workspace",
    "Add up to 5 data sources",
    "Create up to 5 dashboards",
    "Limited to 1 shareable or public dashboard",
    "Limited AI usage",
  ],
  isRecommendedPlan: false,
} as const satisfies PlanConfig;

export const BasicPlanConfig: PlanConfig = {
  featurePlan: "basic",
  featurePlanName: "Avandar Starter",
  features: [
    "Everything in the free plan",
    "Unlimited team members for your workspace",
    "Add up to 10 data sources, plus 5 data sources per additional team member",
    "Unlimited internal, shareable, and public dashboards",
    "Limited maximum data size per dashboard",
    "Extended AI usage",
  ],
  isRecommendedPlan: false,
} as const satisfies PlanConfig;

export const PremiumPlanConfig: PlanConfig = {
  featurePlan: "premium",
  featurePlanName: "Avandar Impact",
  isRecommendedPlan: true,
  features: [
    "Everything in the basic plan",
    "Add up to 100 data sources, plus 10 data sources per additional team member",
    "Unlimited internal, shareable, and public dashboards",
    "Unlimited data size per dashboard",
    "Unlimited AI usage",
    "Priority support and attention to feature requests",
  ],
} as const satisfies PlanConfig;

export const FreePlanLimitsConfig = {
  maxSeatsAllowed: 2,
  maxDatasetsAllowed: 5,
  maxDashboardsAllowed: 5,
  maxShareableDashboardsAllowed: 1,
} as const;

export const BasicPlanLimitsConfig = {
  maxDatasetsBase: 10,
  datasetsPerAdditionalSeat: 5,
  maxDashboardsAllowed: null,          // unlimited
  maxShareableDashboardsAllowed: null, // unlimited
} as const;

export const PremiumPlanLimitsConfig = {
  maxDatasetsBase: 100,
  datasetsPerAdditionalSeat: 10,
  maxDashboardsAllowed: null,          // unlimited
  maxShareableDashboardsAllowed: null, // unlimited
} as const;

/**
 * Computes the four subscription limit columns to store in the `subscriptions`
 * table. Returns DB-column-name keys so the result can be spread directly into
 * a Supabase insert/update/upsert object.
 *
 * @param featurePlan - "free" | "basic" | "premium"
 * @param seats - Number of purchased seats (>= 1)
 */
export function computeSubscriptionLimits(
  featurePlan: FeaturePlan,
  seats: number,
): {
  max_seats_allowed: number;
  max_datasets_allowed: number | null;
  max_dashboards_allowed: number | null;
  max_shareable_dashboards_allowed: number | null;
} {
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
  const additionalSeats = seats - 1;

  return {
    max_seats_allowed: seats,
    max_datasets_allowed:
      limitsConfig.maxDatasetsBase +
      additionalSeats * limitsConfig.datasetsPerAdditionalSeat,
    max_dashboards_allowed: limitsConfig.maxDashboardsAllowed,
    max_shareable_dashboards_allowed:
      limitsConfig.maxShareableDashboardsAllowed,
  };
}
