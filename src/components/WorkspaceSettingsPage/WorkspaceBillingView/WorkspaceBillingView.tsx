import { Group, Loader, Stack, Text, Title } from "@mantine/core";
import { match } from "ts-pattern";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { isDefined } from "@/lib/utils/guards/guards";
import { BillingPortalButton } from "./BillingPortalButton/BillingPortalButton";
import { PlanCard } from "./PlanCard";
import {
  SubscriptionPlan,
  SubscriptionPlanGroup,
} from "./SubscriptionPlan.types";
import { useSubscriptionPlans } from "./useSubscriptionPlans";

type Props = {
  hideTitle?: boolean;
};

export function WorkspaceBillingView({ hideTitle }: Props): JSX.Element {
  const currentWorkspace = useCurrentWorkspace();
  const [subscriptionPlanGroups = [], isLoadingSubscriptionPlans] =
    useSubscriptionPlans();

  const titleBlock = (
    <div>
      {!hideTitle ?
        <Title order={3} mb="xs">
          Billing
        </Title>
      : null}
      <Text c="dimmed">Choose a plan that works best for your workspace.</Text>
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

  const allPlans = sortedPlanGroups.flatMap(
    (planGroup: SubscriptionPlanGroup): SubscriptionPlan[] => {
      return match(planGroup)
        .with({ type: "free" }, (group) => {
          return [group.freePlan, group.payWhatYouWantPlan].filter(isDefined);
        })
        .with({ type: "paid" }, (group) => {
          return [group.monthlyPlan, group.annualPlan];
        })
        .exhaustive();
    },
  );

  const currentSubscribedPlan = allPlans.find((plan) => {
    return (
      plan.polarProductId === currentWorkspace.subscription?.polarProductId
    );
  });

  const hasSubscription = !!currentWorkspace.subscription;

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
                  currentSubscribedPlan={currentSubscribedPlan}
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
                  currentSubscribedPlan={currentSubscribedPlan}
                  defaultVariant="year"
                />
              );
            })
            .exhaustive();
        })}
      </Group>
      {hasSubscription ?
        <>
          <Stack gap="xs" align="flex-start">
            <Text c="dimmed">
              For more control over your subscription, you can manage your
              subscription in your billing portal.
            </Text>
            <BillingPortalButton />
          </Stack>

          <div>
            <Title order={3} mb="xs">
              Payment Methods
            </Title>
            <Stack gap="xs" align="flex-start">
              <Text c="dimmed">
                Changes to your payment method can be made in your billing
                portal.
              </Text>
              <BillingPortalButton />
            </Stack>
          </div>
        </>
      : null}
    </Stack>
  );
}
