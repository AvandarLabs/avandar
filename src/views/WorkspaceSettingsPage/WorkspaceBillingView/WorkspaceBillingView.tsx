import { Trans } from "@lingui/react/macro";
import { Group, Loader, Stack, Text, Title } from "@mantine/core";
import { isDefined } from "@utils";
import { match } from "ts-pattern";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { BillingPortalButton } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/BillingPortalButton/BillingPortalButton";
import { PlanCard } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/PlanCard";
import { useSubscriptionPlans } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/useSubscriptionPlans";
import type {
  SubscriptionPlan,
  SubscriptionPlanGroup,
} from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";

type Props = {
  hideTitle?: boolean;
  hideIntroText?: boolean;
};

export function WorkspaceBillingView({
  hideTitle,
  hideIntroText,
}: Props): JSX.Element {
  const currentWorkspace = useCurrentWorkspace();
  const [subscriptionPlanGroups = [], isLoadingSubscriptionPlans] =
    useSubscriptionPlans();

  const elements = {
    titleBlock: () => {
      if (hideIntroText) {
        return null;
      }
      return (
        <div>
          {!hideTitle ?
            <Title order={3} mb="xs">
              <Trans>Billing</Trans>
            </Title>
          : null}
          <Text c="dimmed">
            <Trans>Choose a plan that works best for your workspace.</Trans>
          </Text>
        </div>
      );
    },
    currentPlan: () => {
      if (hideIntroText) {
        return null;
      }

      const currentFeaturePlanName =
        currentSubscribedPlan?.featurePlan.metadata.featurePlanName;
      if (currentFeaturePlanName) {
        return (
          <Text size="md" mt="xs" fw={500}>
            <Trans>
              You are currently on the{" "}
              <Text span fw={700}>
                {currentFeaturePlanName}
              </Text>{" "}
              plan.
            </Trans>
          </Text>
        );
      }
      return null;
    },
  };

  if (isLoadingSubscriptionPlans) {
    return (
      <Stack gap="lg">
        {elements.titleBlock()}
        <Stack>
          <Text>
            <Trans>Loading plans...</Trans>
          </Text>
          <Loader />
        </Stack>
      </Stack>
    );
  }

  if (subscriptionPlanGroups.length === 0) {
    return (
      <Stack gap="lg">
        {elements.titleBlock()}
        <Text>
          <Trans>No plans available.</Trans>
        </Text>
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
      <div>
        {elements.titleBlock()}
        {elements.currentPlan()}
      </div>
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
                  defaultVariant={group.payWhatYouWantPlan ? "custom" : "free"}
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
      {hasSubscription && currentSubscribedPlan?.priceType !== "free" ?
        <>
          <Group gap="xxxs" align="center">
            <Text c="dimmed">
              <Trans>
                For more control over your subscription, you can manage your
                subscription in your
              </Trans>
            </Text>
            <BillingPortalButton>
              <Trans>billing portal.</Trans>
            </BillingPortalButton>
          </Group>

          <div>
            <Title order={3} mb="xs">
              <Trans>Payment Methods</Trans>
            </Title>
            <Group gap="xxxs" align="center">
              <Text c="dimmed">
                <Trans>
                  Changes to your payment method can be made in your
                </Trans>
              </Text>
              <BillingPortalButton>
                <Trans>billing portal.</Trans>
              </BillingPortalButton>
            </Group>
          </div>
        </>
      : null}
    </Stack>
  );
}
