import { useQuery } from "@hooks/useQuery/useQuery";
import { isDefined } from "@utils/guards/isDefined/isDefined";
import { makeBucketMap } from "@utils/maps/makeBucketMap/makeBucketMap";
import { prop } from "@utils/objects/hofs/prop/prop";
import { APIClient } from "@/clients/APIClient";
import {
  isAnnualPaidSeatsPlan,
  isFreePlan,
  isMonthlyPaidSeatsPlan,
  isMonthlyPayWhatYouWantPlan,
  isSeatBasedPlan,
  makeSubscriptionPlanFromPolarProduct,
} from "@/components/WorkspaceSettingsPage/WorkspaceBillingView/planUtils";
import type { SubscriptionPlanGroup } from "@/components/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";
import type { UseQueryResultTuple } from "@hooks/useQuery/useQuery";

export function useSubscriptionPlans(): UseQueryResultTuple<
  SubscriptionPlanGroup[]
> {
  return useQuery({
    queryKey: ["subscriptions", "products"],
    queryFn: async (): Promise<SubscriptionPlanGroup[]> => {
      const data = await APIClient.get({
        route: "subscriptions/products",
      });
      // convert the Polar Product[] array to a SubscriptionPlan[] array
      const allPlans = data.products
        .map(makeSubscriptionPlanFromPolarProduct)
        .filter(isDefined);

      // Filter out archived products
      const eligiblePlans = allPlans.filter((plan) => {
        return !plan.isArchived;
      });

      // Group products by base name
      const plansByFeatureGroupType = makeBucketMap(eligiblePlans, {
        keyFn: prop("featurePlan.type"),
      });

      const planGroups: SubscriptionPlanGroup[] = Array.from(
        plansByFeatureGroupType.values(),
      )
        .map((planGroup) => {
          // now convert these buckets to SubscriptionPlanGroup types
          // if either plan is a free plan, then it is the Free group
          if (planGroup.some(isFreePlan)) {
            const freePlan = planGroup.find(isFreePlan);
            const payWhatYouWantPlan = planGroup.find(
              isMonthlyPayWhatYouWantPlan,
            );

            // there must always be a Free plan
            if (freePlan) {
              return {
                type: "free" as const,
                freePlan,
                payWhatYouWantPlan,
                featurePlan: freePlan.featurePlan,
              };
            }
          }

          if (planGroup.some(isSeatBasedPlan)) {
            const monthlyPlan = planGroup.find(isMonthlyPaidSeatsPlan);
            const annualPlan = planGroup.find(isAnnualPaidSeatsPlan);

            // there must be both a monthly and annual plan
            if (monthlyPlan && annualPlan) {
              return {
                type: "paid" as const,
                monthlyPlan,
                annualPlan,
                featurePlan: monthlyPlan.featurePlan,
              };
            }
          }
          return undefined;
        })
        .filter(isDefined);
      return planGroups;
    },
  });
}
