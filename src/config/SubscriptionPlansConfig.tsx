// TODO(jpsyx): Eventually this should not exist hardcoded here. This data
// should be managed externally in Supabase.
type PlanConfig = {
  featurePlan: "free" | "basic" | "premium";
  featurePlanName: string;
  features: readonly string[];
};

export const FreePlanConfig = {
  featurePlan: "free",
  featurePlanName: "Avandar Free",
  features: [
    "Up to 5 data sources",
    "Up to 2 team members in your workspace",
    "Data source manager",
    "Data explorer",
    "Data profile designer",
  ],
} as const satisfies PlanConfig;

export const BasicPlanConfig: PlanConfig = {
  featurePlan: "basic",
  featurePlanName: "Avandar Basic",
  features: [
    "Everything in the free plan",
    "Up to 5 team members in your workspace",
    "Up to 20 data sources, plus 5 data sources per team member",
    "Early access to the upcoming Dashboard product",
    "Early access to the upcoming Map/GIS product",
    "Early access to upcoming AI features",
  ],
} as const satisfies PlanConfig;

export const PremiumPlanConfig: PlanConfig = {
  featurePlan: "premium",
  featurePlanName: "Avandar Premium",
  features: [
    "Everything in the basic plan",
    "Unlimited team members for your workspace",
    "Up to 100 data sources, plus 10 data sources per team member",
    "Early access to Avandar's upcoming curated open data database",
    "Early access to Avandar's upcoming plugin marketplace",
    "Early access to serving your own public data APIs",
    "Access to Premium-exclusive features and workshops",
  ],
} as const satisfies PlanConfig;
