import { APIClient } from "@/clients/APIClient";
import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import { isDefined } from "@/lib/utils/guards/guards";
import { makeBucketMap } from "@/lib/utils/maps/makeBucketMap";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import {
  isAnnualPaidSeatsPlan,
  isAnnualPayWhatYouWantPlan,
  isFreePlan,
  isMonthlyPaidSeatsPlan,
  isMonthlyPayWhatYouWantPlan,
  isSeatBasedPlan,
  makeSubscriptionPlanFromPolarProduct,
} from "./planUtils";
import { SubscriptionPlanGroup } from "./SubscriptionPlan.types";

export function useSubscriptionPlans(): UseQueryResultTuple<
  SubscriptionPlanGroup[]
> {
  return useQuery({
    queryKey: ["subscriptionPlans"],
    queryFn: async (): Promise<SubscriptionPlanGroup[]> => {
      const data = await APIClient.get("billing/plans");
      // convert the Polar Product[] array to a SubscriptionPlan[] array
      const allPlans = data.plans
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
            const monthlyPayWhatYouWantPlan = planGroup.find(
              isMonthlyPayWhatYouWantPlan,
            );
            const annualPayWhatYouWantPlan = planGroup.find(
              isAnnualPayWhatYouWantPlan,
            );

            // there must be both a monthly and annual plan
            if (monthlyPlan && annualPlan) {
              return {
                type: "paid" as const,
                monthlyPlan,
                annualPlan,
                monthlyPayWhatYouWantPlan,
                annualPayWhatYouWantPlan,
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
