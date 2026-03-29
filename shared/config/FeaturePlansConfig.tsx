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
  maxDashboardsAllowed: null, // unlimited
  maxShareableDashboardsAllowed: null, // unlimited
} as const;

export const PremiumPlanLimitsConfig = {
  maxDatasetsBase: 100,
  datasetsPerAdditionalSeat: 10,
  maxDashboardsAllowed: null, // unlimited
  maxShareableDashboardsAllowed: null, // unlimited
} as const;
