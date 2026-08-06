import { Trans } from "@lingui/react/macro";
import { Group, Loader, Stack, Text, Title } from "@mantine/core";
import { isDefined } from "@utils";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import { match } from "ts-pattern";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { BillingPortalButton } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/BillingPortalButton/BillingPortalButton";
import { PlanCard } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/PlanCard";
import { useSubscriptionPlans } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/useSubscriptionPlans";
import type {
  SubscriptionPlan,
  SubscriptionPlanGroup,
} from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { SetRequired } from "type-fest";

type Props = {
  hideTitle?: boolean;
  hideIntroText?: boolean;
  /** When set (e.g. billing modal), avoids route hooks in a portal. */
  workspace?: Workspace.WithSubscription;
};

export function WorkspaceBillingView(props: Props): JSX.Element {
  if (props.workspace) {
    return (
      <WorkspaceBillingViewContent {...props} workspace={props.workspace} />
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
}: SetRequired<Props, "workspace">): JSX.Element {
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

  // Sort plan groups by price (cheapest first). Use toSorted so we don't
  // mutate the array returned by the query hook.
  const sortedPlanGroups: SubscriptionPlanGroup[] =
    subscriptionPlanGroups.toSorted((planGroupA, planGroupB) => {
      const priceA =
        planGroupA.type === "free" ?
          0
        : planGroupA.annualPlan.normalizedPricePerSeatPerMonth;
      const priceB =
        planGroupB.type === "free" ?
          0
        : planGroupB.annualPlan.normalizedPricePerSeatPerMonth;
      return priceA - priceB;
    });

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

  const subscription = currentWorkspace.subscription;
  const currentSubscribedPlan =
    subscription ?
      allPlans.find((plan) => {
        // Polar-backed: match the Polar product id.
        // Native free: any free plan card is the current plan.
        return (
          plan.polarProductId === subscription.polarProductId ||
          (SubscriptionModule.isNativeFreeSubscription(subscription) &&
            plan.priceType === "free")
        );
      })
    : undefined;

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
      {subscription && currentSubscribedPlan?.priceType !== "free" ?
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
