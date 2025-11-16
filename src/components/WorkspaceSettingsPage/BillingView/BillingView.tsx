import { Group, Loader, Stack, Text, Title } from "@mantine/core";
import { match } from "ts-pattern";
import { FreePlanCard } from "./FreePlanCard";
import { PaidPlanCard } from "./PaidPlanCard";
import { SubscriptionPlanGroup } from "./SubscriptionPlan.types";
import { useSubscriptionPlans } from "./useSubscriptionPlans";

export function BillingView(): JSX.Element {
  const [subscriptionPlans = [], isLoadingSubscriptionPlans] =
    useSubscriptionPlans();
  console.log("subscriptionPlans", subscriptionPlans);

  const titleBlock = (
    <div>
      <Title order={3} mb="xs">
        Billing
      </Title>
      <Text size="sm" c="dimmed">
        Choose a plan that works best for your workspace.
      </Text>
    </div>
  );

  if (isLoadingSubscriptionPlans) {
    return (
      <Stack gap="lg">
        {titleBlock}
        <Stack>
          <Text>Loading plans...</Text>
          <Loader />
        </Stack>
      </Stack>
    );
  }

  if (subscriptionPlans.length === 0) {
    return (
      <Stack gap="lg">
        {titleBlock}
        <Text>No plans available.</Text>
      </Stack>
    );
  }

  // Convert map to array and sort by price (cheapest first)
  const sortedPlanGroups: SubscriptionPlanGroup[] = subscriptionPlans.sort(
    (planGroupA, planGroupB) => {
      const priceA =
        planGroupA.type === "free" ?
          0
        : planGroupA.annualPlan.normalizedPricePerSeatPerMonth;
      const priceB =
        planGroupB.type === "free" ?
          0
        : planGroupB.annualPlan.normalizedPricePerSeatPerMonth;
      return priceA - priceB;
    },
  );

  return (
    <Stack gap="lg">
      {titleBlock}
      <Group align="stretch" wrap="nowrap" gap="lg">
        {sortedPlanGroups.map((planGroup) => {
          return match(planGroup)
            .with({ type: "free" }, (group) => {
              const { freePlan, payWhatYouWantPlan, featurePlan } = group;
              return (
                <FreePlanCard
                  key={featurePlan.type}
                  basePlanName={featurePlan.metadata.featurePlanName}
                  freePlan={freePlan}
                  payWhatYouWantPlan={payWhatYouWantPlan}
                  isCurrentPlan={false}
                  featurePlan={featurePlan}
                />
              );
            })
            .with({ type: "paid" }, (group) => {
              const {
                monthlyPlan,
                annualPlan,
                monthlyPayWhatYouWantPlan,
                annualPayWhatYouWantPlan,
                featurePlan,
              } = group;
              return (
                <PaidPlanCard
                  key={featurePlan.type}
                  basePlanName={featurePlan.metadata.featurePlanName}
                  monthlyPlan={monthlyPlan}
                  annualPlan={annualPlan}
                  monthlyPayWhatYouWantPlan={monthlyPayWhatYouWantPlan}
                  annualPayWhatYouWantPlan={annualPayWhatYouWantPlan}
                  featurePlan={featurePlan}
                  isCurrentPlan={false}
                />
              );
            })
            .exhaustive();
        })}
      </Group>
    </Stack>
  );
}
