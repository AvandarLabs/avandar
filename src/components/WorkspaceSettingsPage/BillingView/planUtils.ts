import { SegmentedControlItem } from "@mantine/core";
import { match } from "ts-pattern";
import {
  BasicPlanConfig,
  FreePlanConfig,
  PremiumPlanConfig,
} from "@/config/FeaturePlansConfig";
import { Logger } from "@/lib/Logger";
import { isOneOf } from "@/lib/utils/guards/guards";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { SubscriptionsAPI } from "../../../../supabase/functions/subscriptions/subscriptions.types";
import {
  AnnualPaidSeatsPlan,
  FeaturePlan,
  FreePlanVariants,
  MonthlyPaidSeatsPlan,
  MonthlyPayWhatYouWantPlan,
  PaidPlanVariants,
  SubscriptionPlan,
} from "./SubscriptionPlan.types";

type AvaPolarProduct =
  SubscriptionsAPI["subscriptions"]["/plans"]["GET"]["returnType"]["plans"][number];

export const FREE_CHOICES = [
  { value: "custom", label: "Pay what you want" },
  { value: "free", label: "Free" },
] as const satisfies SegmentedControlItem[];

export const PAID_CHOICES = [
  { value: "year", label: "Pay yearly" },
  { value: "month", label: "Pay monthly" },
] as const satisfies SegmentedControlItem[];

export function isValidFreePlanVariant(
  choice: string,
): choice is FreePlanVariants {
  return isOneOf(choice, FREE_CHOICES.map(prop("value")));
}

export function isValidPaidPlanVariant(
  choice: string,
): choice is PaidPlanVariants {
  return isOneOf(choice, PAID_CHOICES.map(prop("value")));
}

/**
 * Extracts the base name from a product name by removing parentheses and their
 * contents.
 * Example: "Avandar Sandbox Basic (Monthly)" -> "Avandar Sandbox Basic"
 */
export function getBasePlanName(fullPlanName: string | undefined): string {
  if (fullPlanName === undefined) {
    return "Unknown Plan";
  }
  return fullPlanName.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/**
 * Checks if a plan is a Free plan.
 */
export function isFreePlan(
  plan: SubscriptionPlan | undefined,
): plan is SubscriptionPlan & { priceType: "free" } {
  return plan?.priceType === "free";
}

export function isSeatBasedPlan(
  plan: SubscriptionPlan | undefined,
): plan is SubscriptionPlan & { priceType: "seat_based" } {
  return plan?.priceType === "seat_based";
}

/**
 * Checks if a plan is a monthly plan.
 */
export function isMonthlyPaidSeatsPlan(
  plan: SubscriptionPlan | undefined,
): plan is MonthlyPaidSeatsPlan {
  return plan?.priceType === "seat_based" && plan?.planInterval === "month";
}

/**
 * Checks if a plan is an annual plan.
 */
export function isAnnualPaidSeatsPlan(
  plan: SubscriptionPlan | undefined,
): plan is AnnualPaidSeatsPlan {
  return plan?.priceType === "seat_based" && plan?.planInterval === "year";
}

export function isPayWhatYouWantPlan(
  plan: SubscriptionPlan | undefined,
): plan is SubscriptionPlan & { priceType: "custom" } {
  return plan?.priceType === "custom";
}

export function isMonthlyPayWhatYouWantPlan(
  plan: SubscriptionPlan | undefined,
): plan is MonthlyPayWhatYouWantPlan {
  return plan?.priceType === "custom" && plan?.planInterval === "month";
}

function _getFeaturePlanType(
  product: AvaPolarProduct,
): FeaturePlan | undefined {
  const { metadata } = product;
  if ("featurePlanType" in metadata) {
    if (metadata.featurePlanType === "free") {
      return {
        type: "free" as const,
        metadata: FreePlanConfig,
      };
    }
    if (metadata.featurePlanType === "basic") {
      return {
        type: "basic" as const,
        metadata: BasicPlanConfig,
      };
    }
    if (metadata.featurePlanType === "premium") {
      return {
        type: "premium" as const,
        metadata: PremiumPlanConfig,
      };
    }
  }
  Logger.error("Polar Product metadata is missing a `featurePlanType`");
  return undefined;
}

/**
 * Converts a Polar product to a SubscriptionPlan.
 * @param product - The Polar product to convert.
 * @returns The SubscriptionPlan, or undefined if the product is not a valid
 * subscription plan (e.g. if it has no prices).
 */
export function makeSubscriptionPlanFromPolarProduct(
  product: AvaPolarProduct,
): SubscriptionPlan | undefined {
  const {
    name,
    prices,
    description,
    isArchived,
    recurringInterval,
    id: polarProductId,
  } = product;
  const firstPrice = prices[0];
  if (!firstPrice) {
    return undefined;
  }
  const basePlanName = getBasePlanName(product.name);
  const featurePlan = _getFeaturePlanType(product);

  if (!featurePlan) {
    return undefined;
  }

  return match(firstPrice)
    .with({ amountType: "free" }, () => {
      return {
        priceType: "free" as const,
        polarProductId,
        isArchived,
        description: description ?? "",
        planFullName: name,
        planBaseName: basePlanName,
        featurePlan,
      };
    })
    .with({ amountType: "custom" }, () => {
      if (
        !recurringInterval ||
        (recurringInterval !== "month" && recurringInterval !== "year")
      ) {
        return undefined;
      }

      return {
        priceType: "custom" as const,
        polarProductId,
        isArchived,
        description: description ?? "",
        planFullName: name,
        planBaseName: basePlanName,
        planInterval: recurringInterval,
        metadata: product.metadata,
        featurePlan,
      };
    })
    .with({ amountType: "seat_based" }, (price) => {
      const { seatTiers, priceCurrency } = price;

      // Avandar plans don't have more than one tier
      const firstTier = seatTiers[0];
      if (!firstTier) {
        return undefined;
      }
      if (
        !recurringInterval ||
        (recurringInterval !== "month" && recurringInterval !== "year")
      ) {
        return undefined;
      }

      const { pricePerSeat } = firstTier;
      return {
        priceType: "seat_based" as const,
        polarProductId,
        isArchived,
        description: description ?? "",
        planFullName: name,
        planBaseName: basePlanName,
        metadata: product.metadata,
        pricePerSeat,
        normalizedPricePerSeatPerMonth:
          pricePerSeat / 100 / (recurringInterval === "year" ? 12 : 1),
        priceCurrency,
        planInterval: recurringInterval,
        featurePlan,
      };
    })
    .exhaustive();
}

export function calculateYearlyDiscount(options: {
  monthlyPlanPrice?: number;
  annualPlanPricePerMonth?: number;
}): number | undefined {
  const { monthlyPlanPrice, annualPlanPricePerMonth } = options;
  if (!monthlyPlanPrice || !annualPlanPricePerMonth || monthlyPlanPrice === 0) {
    return undefined;
  }
  const discount =
    ((monthlyPlanPrice - annualPlanPricePerMonth) / monthlyPlanPrice) * 100;
  return Math.round(discount);
}
