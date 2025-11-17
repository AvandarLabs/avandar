import {
  BasicPlanConfig,
  FreePlanConfig,
  PremiumPlanConfig,
} from "@/config/SubscriptionPlansConfig";

export type FreePlanVariants = "free" | "custom";
export type PaidPlanVariants = "month" | "year";

export type FeaturePlan =
  | {
      type: "free";
      metadata: typeof FreePlanConfig;
    }
  | {
      type: "basic";
      metadata: typeof BasicPlanConfig;
    }
  | {
      type: "premium";
      metadata: typeof PremiumPlanConfig;
    };

export type SubscriptionPlan = {
  polarProductId: string;
  planFullName: string;
  description: string;
  isArchived: boolean;
  featurePlan: FeaturePlan;
} & (
  | {
      priceType: "free";
    }
  | {
      priceType: "custom"; // i.e. Pay What You Want
      planInterval: "month" | "year";
    }
  | {
      priceType: "seat_based";
      pricePerSeat: number;
      normalizedPricePerSeatPerMonth: number;
      priceCurrency: string;
      planInterval: "month" | "year";
    }
);

export type PaidSubscriptionPlanGroup = {
  type: "paid";
  monthlyPlan: MonthlyPaidSeatsPlan;
  annualPlan: AnnualPaidSeatsPlan;
  featurePlan: FeaturePlan;
};

export type FreeSubscriptionPlanGroup = {
  type: "free";
  freePlan: FreePlan;
  payWhatYouWantPlan?: MonthlyPayWhatYouWantPlan;
  featurePlan: FeaturePlan;
};

/**
 * A plan group refers to a tuple of plans that represent the same benefits
 * (e.g. Basic or Premium) but differ in pricing.
 */
export type SubscriptionPlanGroup =
  | PaidSubscriptionPlanGroup
  | FreeSubscriptionPlanGroup;

export type MonthlyPaidSeatsPlan = SubscriptionPlan & {
  priceType: "seat_based";
  planInterval: "month";
};

export type AnnualPaidSeatsPlan = SubscriptionPlan & {
  priceType: "seat_based";
  planInterval: "year";
};

export type FreePlan = SubscriptionPlan & {
  priceType: "free";
};

export type MonthlyPayWhatYouWantPlan = SubscriptionPlan & {
  priceType: "custom";
  planInterval: "month";
};
