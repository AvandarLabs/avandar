import { Group, Loader, Stack, Text, Title } from "@mantine/core";
import { isDefined } from "@utils";
import { match } from "ts-pattern";
import { BillingPortalButton } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/BillingPortalButton/BillingPortalButton";
import { PlanCard } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/PlanCard";
import { useSubscriptionPlans } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/useSubscriptionPlans";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type {
  SubscriptionPlan,
  SubscriptionPlanGroup,
} from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";
import type { Workspace } from "$/models/Workspace/Workspace";

type Props = {
  hideTitle?: boolean;
  hideIntroText?: boolean;
  /** When set (e.g. billing modal), avoids route hooks in a portal. */
  workspace?: Workspace.WithSubscription;
};

export function WorkspaceBillingView(props: Props): JSX.Element {
  if (props.workspace) {
    return (
      <WorkspaceBillingViewContent
        {...props}
        workspace={props.workspace}
      />
    );
  }

  return <WorkspaceBillingViewFromRoute {...props} />;
}

function WorkspaceBillingViewFromRoute(
  props: Omit<Props, "workspace">,
): JSX.Element {
  const workspace = useCurrentWorkspace();
  return <WorkspaceBillingViewContent {...props} workspace={workspace} />;
}

function WorkspaceBillingViewContent({
  hideTitle,
  hideIntroText,
  workspace: currentWorkspace,
}: Props & {
  workspace: Workspace.WithSubscription;
}): JSX.Element {
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
              Billing
            </Title>
          : null}
          <Text c="dimmed">
            Choose a plan that works best for your workspace.
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
            You are currently on the{" "}
            <Text span fw={700}>
              {currentFeaturePlanName}
            </Text>{" "}
            plan.
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
          <Text>Loading plans...</Text>
          <Loader />
        </Stack>
      </Stack>
    );
  }

  if (subscriptionPlanGroups.length === 0) {
    return (
      <Stack gap="lg">
        {elements.titleBlock()}
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
    const subscription = currentWorkspace.subscription;
    if (subscription === undefined) {
      return false;
    }

    if (
      subscription.polarProductId !== undefined &&
      plan.polarProductId === subscription.polarProductId
    ) {
      return true;
    }

    if (
      subscription.polarProductId === undefined &&
      plan.priceType === "free" &&
      subscription.featurePlanType === "free"
    ) {
      return true;
    }

    return false;
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
                  workspaceId={currentWorkspace.id}
                  workspaceSlug={currentWorkspace.slug}
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
                  workspaceId={currentWorkspace.id}
                  workspaceSlug={currentWorkspace.slug}
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
              For more control over your subscription, you can manage your
              subscription in your
            </Text>
            <BillingPortalButton>billing portal.</BillingPortalButton>
          </Group>

          <div>
            <Title order={3} mb="xs">
              Payment Methods
            </Title>
            <Group gap="xxxs" align="center">
              <Text c="dimmed">
                Changes to your payment method can be made in your
              </Text>
              <BillingPortalButton>billing portal.</BillingPortalButton>
            </Group>
          </div>
        </>
      : null}
    </Stack>
  );
}
