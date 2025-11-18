import { Group, Loader, Stack, Text, Title } from "@mantine/core";
import { match } from "ts-pattern";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PlanCard } from "./PlanCard";
import { SubscriptionPlanGroup } from "./SubscriptionPlan.types";
import { useSubscriptionPlans } from "./useSubscriptionPlans";

export function BillingView(): JSX.Element {
  const currentWorkspace = useCurrentWorkspace();
  const [subscriptionPlanGroups = [], isLoadingSubscriptionPlans] =
    useSubscriptionPlans();

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

  if (subscriptionPlanGroups.length === 0) {
    return (
      <Stack gap="lg">
        {titleBlock}
        <Text>No plans available.</Text>
      </Stack>
    );
  }

  // Convert map to array and sort by price (cheapest first)
  const sortedPlanGroups: SubscriptionPlanGroup[] = subscriptionPlanGroups.sort(
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
              return (
                <PlanCard
                  key={group.featurePlan.type}
                  type="free"
                  planGroup={group}
                  currentSubscription={currentWorkspace.subscription}
                  defaultVariant="custom"
                />
              );
            })
            .with({ type: "paid" }, (group) => {
              return (
                <PlanCard
                  key={group.featurePlan.type}
                  type="paid"
                  planGroup={group}
                  currentSubscription={currentWorkspace.subscription}
                  defaultVariant="year"
                />
              );
            })
            .exhaustive();
        })}
      </Group>
    </Stack>
  );
}
