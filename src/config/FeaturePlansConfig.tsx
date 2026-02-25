// TODO(jpsyx): Eventually this should not exist hardcoded here. This data
// should be managed externally in Supabase.
type PlanConfig = {
  featurePlan: "free" | "basic" | "premium";
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
    "Limited to 1 public dashboard",
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
    "Unlimited internal and public dashboards",
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
    "Unlimited internal and public dashboards",
    "Unlimited data size per dashboard",
    "Unlimited AI usage",
    "Priority support and attention to feature requests",
  ],
} as const satisfies PlanConfig;
