import { useLingui } from "@lingui/react/macro";
import { SegmentedControlItem } from "@mantine/core";
import {
  BasicPlanConfig,
  FreePlanConfig,
  PremiumPlanConfig,
} from "$/config/FeaturePlansConfig";
import { match } from "ts-pattern";
import { isOneOf } from "@/lib/utils/guards/guards";
import { Logger } from "@/utils/Logger";
import {
  AnnualPaidSeatsPlan,
  FeaturePlan,
  FreePlanVariants,
  MonthlyPaidSeatsPlan,
  MonthlyPayWhatYouWantPlan,
  PaidPlanVariants,
  SubscriptionPlan,
} from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";
import type { SubscriptionsAPI } from "@sbfn/subscriptions/subscriptions.routes.types";

type AvaPolarProduct =
  SubscriptionsAPI["subscriptions"]["/products"]["GET"]["returnType"]["products"][number];

const FREE_CHOICE_VALUES = ["custom", "free"] as const;
const PAID_CHOICE_VALUES = ["year", "month"] as const;

/** Localized free-plan variant choices for the segmented control. */
export function useFreeChoices(): readonly SegmentedControlItem[] {
  const { t } = useLingui();
  return [
    { value: "custom", label: t`Pay what you want` },
    { value: "free", label: t`Free` },
  ];
}

/** Localized paid-plan variant choices for the segmented control. */
export function usePaidChoices(): readonly SegmentedControlItem[] {
  const { t } = useLingui();
  return [
    { value: "year", label: t`Pay yearly` },
    { value: "month", label: t`Pay monthly` },
  ];
}

export function isValidFreePlanVariant(
  choice: string,
): choice is FreePlanVariants {
  return isOneOf(choice, FREE_CHOICE_VALUES);
}

export function isValidPaidPlanVariant(
  choice: string,
): choice is PaidPlanVariants {
  return isOneOf(choice, PAID_CHOICE_VALUES);
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
  const basePlanName = getBasePlanName(product.name);
  const featurePlan = _getFeaturePlanType(product);

  if (!featurePlan) {
    return undefined;
  }

  // Free plans are native (no Polar checkout) so we don't need a Polar price
  // to render the Free card. Polar has deprecated
  // `LegacyRecurringProductPriceFree` and now ships some free recurring
  // products without any price object, which would otherwise cause the
  // product to be dropped below.
  if (featurePlan.type === "free") {
    return {
      priceType: "free" as const,
      polarProductId,
      isArchived,
      description: description ?? "",
      planFullName: name,
      featurePlan,
    };
  }

  const firstPrice = prices[0];
  if (!firstPrice) {
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
