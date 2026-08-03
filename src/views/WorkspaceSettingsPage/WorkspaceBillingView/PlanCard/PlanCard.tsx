import {
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { useRouter } from "@tanstack/react-router";
import { notifyError, notifyExpiredSession, notifySuccess } from "@ui";
import { SUPPORT_EMAIL } from "$/config/AppConfig";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import { useState } from "react";
import { match } from "ts-pattern";
import { SubscriptionClient } from "@/clients/SubscriptionClient";
import { UserClient } from "@/clients/UserClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { getCurrentUrl } from "@browser-utils";
import { getBillingActionFromSelectedPlan } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/getBillingActionFromSelectedPlan";
import { goToPolarCheckout } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/goToPolarCheckout";
import { useChangePlanModal } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/openChangePlanModal/useChangePlanModal";
import { PaidPlanPriceRow } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/PaidPlanPriceRow";
import css from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/PlanCard.module.css";
import { PlanSwitch } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanCard/PlanVariantSwitch";
import { PlanFeatures } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanFeatures";
import {
  calculateYearlyDiscount,
  isValidFreePlanVariant,
  isValidPaidPlanVariant,
} from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/planUtils";
import type {
  FreePlanVariants,
  FreeSubscriptionPlanGroup,
  PaidPlanVariants,
  PaidSubscriptionPlanGroup,
  SubscriptionPlan,
} from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";
import type { Workspace } from "$/models/Workspace/Workspace";

type Props = {
  workspaceId: Workspace.Id;
  workspaceSlug: string;
} & (
  | {
      type: "free";
      planGroup: FreeSubscriptionPlanGroup;
      currentSubscription: Workspace.WithSubscription["subscription"];
      currentSubscribedPlan?: SubscriptionPlan;
      defaultVariant: FreePlanVariants;
    }
  | {
      type: "paid";
      planGroup: PaidSubscriptionPlanGroup;
      currentSubscription: Workspace.WithSubscription["subscription"];
      currentSubscribedPlan?: SubscriptionPlan;
      defaultVariant: PaidPlanVariants;
    }
);

function _getInitialSelectedVariant(
  options: Props,
): FreePlanVariants | PaidPlanVariants {
  const { type, planGroup, defaultVariant } = options;
  const currentSubscription = options.currentSubscription;
  if (currentSubscription === undefined) {
    return defaultVariant;
  }

  if (type === "free") {
    if (
      currentSubscription !== undefined &&
      SubscriptionModule.isNativeFreeSubscription(currentSubscription)
    ) {
      return "free";
    }

    const currentSubscribedPolarProductId = currentSubscription.polarProductId;
    return (
      planGroup.freePlan.polarProductId === currentSubscribedPolarProductId ?
        "free"
      : planGroup.payWhatYouWantPlan ? "custom"
      : "free"
    );
  }

  const currentSubscribedPolarProductId = currentSubscription.polarProductId;
  if (currentSubscribedPolarProductId === undefined) {
    return defaultVariant;
  }

  const isMonthlyPlan =
    planGroup.monthlyPlan.polarProductId === currentSubscribedPolarProductId;
  return isMonthlyPlan ? "month" : "year";
}

export function PlanCard(props: Props): JSX.Element {
  const {
    type,
    planGroup,
    currentSubscription,
    currentSubscribedPlan,
    workspaceId,
    workspaceSlug,
  } = props;
  const router = useRouter();
  const [userProfile] = UserClient.useGetProfile({ workspaceId });
  const [selectedVariant, setSelectedVariant] = useState<
    FreePlanVariants | PaidPlanVariants
  >(_getInitialSelectedVariant(props));
  const openChangePlanModal = useChangePlanModal();
  const [createFreeSub, isCreatingFreeSub] =
    SubscriptionClient.useCreateFreeSubscription({
      onSuccess: () => {
        modals.closeAll();
        notifySuccess("You're on the Free plan");
      },
      onError: () => {
        notifyError(
          `We were unable to update your subscription. Please contact ${SUPPORT_EMAIL}`,
        );
      },
      queryToInvalidate: WorkspaceClient.QueryKeys.getWorkspacesOfCurrentUser(),
    });
  const selectedPlan =
    type === "free" ?
      selectedVariant === "custom" ?
        (planGroup.payWhatYouWantPlan ?? planGroup.freePlan)
      : planGroup.freePlan
    : selectedVariant === "month" ? planGroup.monthlyPlan
    : planGroup.annualPlan;
  const { featurePlan } = selectedPlan;
  const [isLoadingCheckoutPage, setIsLoadingCheckoutPage] = useState(false);
  const isCurrentSubscribedPlan = _isCurrentSubscribedPlan({
    currentSubscription,
    currentSubscribedPlan,
    selectedPlan,
  });

  const paidPlanDiscount =
    type === "paid" ?
      calculateYearlyDiscount({
        monthlyPlanPrice: planGroup.monthlyPlan.normalizedPricePerSeatPerMonth,
        annualPlanPricePerMonth:
          planGroup.annualPlan.normalizedPricePerSeatPerMonth,
      })
    : undefined;

  const isRecommended = planGroup.featurePlan.metadata.isRecommendedPlan;

  const onSelectPlan = async () => {
    if (userProfile) {
      const { userId, email } = userProfile;
      const billingAction = getBillingActionFromSelectedPlan({
        currentSubscription,
        currentSubscribedPlan,
        selectedPlan,
      });

      await match(billingAction)
        .with({ type: "billing_error" }, () => {
          notifyError(
            `We were unable to update your subscription. Please contact ${SUPPORT_EMAIL}`,
          );
        })
        .with({ type: "create_native_free" }, () => {
          createFreeSub({ workspaceId });
        })
        .with({ type: "polar_checkout" }, async () => {
          const currentURL = getCurrentUrl();
          const successURL = router.buildLocation({
            to: "/$workspaceSlug/checkout",
            params: { workspaceSlug },
            search: { success: true },
          });

          setIsLoadingCheckoutPage(true);
          await goToPolarCheckout({
            polarProductId: selectedPlan.polarProductId,
            userId,
            workspaceId,
            returnURL: currentURL,
            successURL: `${window.location.origin}${successURL.href}&checkout_id={CHECKOUT_ID}`,
            checkoutEmail: currentSubscription?.polarCustomerEmail ?? email,
            currentPolarSubscriptionId:
              currentSubscription?.polarSubscriptionId,
            currentCustomerId: currentSubscription?.polarCustomerId,
            numSeats: selectedPlan.priceType === "seat_based" ? 1 : undefined,
          });
        })
        .with({ type: "change_plan" }, () => {
          if (
            currentSubscribedPlan &&
            currentSubscription?.polarSubscriptionId
          ) {
            openChangePlanModal({
              workspaceId,
              newPlan: selectedPlan,
              currentPlan: currentSubscribedPlan,
              currentSubscriptionId: currentSubscription.polarSubscriptionId,
            });
          } else {
            notifyError(
              `We were unable to update your subscription. Please contact ${SUPPORT_EMAIL}`,
            );
          }
        })
        .exhaustive();
    } else {
      notifyExpiredSession();
    }
  };

  const elements = {
    planSwitch: () => {
      if (
        planGroup.type === "free" &&
        planGroup.payWhatYouWantPlan === undefined
      ) {
        return null;
      }

      return match(type)
        .with("free", () => {
          if (isValidFreePlanVariant(selectedVariant)) {
            return (
              <PlanSwitch
                type="free"
                value={selectedVariant}
                onChange={setSelectedVariant}
              />
            );
          }
          return null;
        })
        .with("paid", () => {
          if (isValidPaidPlanVariant(selectedVariant)) {
            return (
              <PlanSwitch
                type="paid"
                value={selectedVariant}
                onChange={setSelectedVariant}
                withHighlight={featurePlan.type === "premium"}
              />
            );
          }
          return null;
        })
        .exhaustive();
    },

    priceRow: () => {
      if (selectedPlan.priceType === "free") {
        return (
          <Text size="xl" fw={600}>
            Free
          </Text>
        );
      }
      if (selectedPlan.priceType === "seat_based") {
        return (
          <PaidPlanPriceRow discount={paidPlanDiscount} plan={selectedPlan} />
        );
      }
      return null;
    },
  };

  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      style={{
        flex: 1,
        ...(isRecommended && {
          borderWidth: 2,
          borderColor: "var(--mantine-color-violet-5)",
        }),
      }}
    >
      <Stack gap="md" h="100%">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" mb="xs">
              <Text fw={600} size="lg">
                {featurePlan.metadata.featurePlanName}
              </Text>
              {isRecommended ?
                <Badge color="violet" variant="light" size="lg">
                  Recommended
                </Badge>
              : null}
              {isCurrentSubscribedPlan ?
                <Tooltip
                  color="neutral.8"
                  label="You are currently subscribed to this plan."
                  className={css.currentPlanBadgeTooltip}
                >
                  <Badge
                    className={css.currentPlanBadge}
                    variant="gradient"
                    gradient={{
                      from: "primary.4",
                      to: "primary.6",
                    }}
                  >
                    Current Plan
                  </Badge>
                </Tooltip>
              : null}
            </Group>
            <Text size="sm" c="dimmed">
              {selectedPlan.description}
            </Text>
          </div>
        </Group>
        {elements.planSwitch()}
        {elements.priceRow()}
        <PlanFeatures features={featurePlan.metadata.features} />
        <Button
          variant={isCurrentSubscribedPlan ? "outline" : "filled"}
          fullWidth
          mt="auto"
          disabled={isCurrentSubscribedPlan}
          onClick={onSelectPlan}
          loading={isLoadingCheckoutPage || isCreatingFreeSub}
        >
          {isCurrentSubscribedPlan ? "Current Plan" : "Select Plan"}
        </Button>
      </Stack>
    </Card>
  );
}

function _isCurrentSubscribedPlan(options: {
  currentSubscription: Props["currentSubscription"];
  currentSubscribedPlan: SubscriptionPlan | undefined;
  selectedPlan: SubscriptionPlan;
}): boolean {
  const { currentSubscription, currentSubscribedPlan, selectedPlan } = options;
  if (!currentSubscription || !currentSubscribedPlan) {
    return false;
  }
  // Polar-backed subscription: the plan card is current when its Polar
  // product id matches. Native free subscription: any free plan card is
  // current (free is identity-less).
  return (
    selectedPlan.polarProductId === currentSubscription.polarProductId ||
    (SubscriptionModule.isNativeFreeSubscription(currentSubscription) &&
      selectedPlan.priceType === "free")
  );
}
