import {
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { match } from "ts-pattern";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyExpiredSession } from "@/lib/ui/notifications/notifyExpiredSession";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { WorkspaceWithSubscription } from "@/models/Workspace/Workspace.types";
import { PlanFeatures } from "../PlanFeatures";
import {
  calculateYearlyDiscount,
  isValidFreePlanVariant,
  isValidPaidPlanVariant,
} from "../planUtils";
import {
  FreePlanVariants,
  FreeSubscriptionPlanGroup,
  PaidPlanVariants,
  PaidSubscriptionPlanGroup,
  SubscriptionPlan,
} from "../SubscriptionPlan.types";
import { EarlySupporterCreditProgramBox } from "./EarlySupporterCreditProgramBox";
import { goToPolarCheckout } from "./goToPolarCheckout";
import { useChangePlanModal } from "./openChangePlanModal";
import { PaidPlanPriceRow } from "./PaidPlanPriceRow";
import css from "./PlanCard.module.css";
import { PlanSwitch } from "./PlanVariantSwitch";

type Props =
  | {
      type: "free";
      planGroup: FreeSubscriptionPlanGroup;
      currentSubscription: WorkspaceWithSubscription["subscription"];
      currentSubscribedPlan?: SubscriptionPlan;
      defaultVariant: FreePlanVariants;
    }
  | {
      type: "paid";
      planGroup: PaidSubscriptionPlanGroup;
      currentSubscription: WorkspaceWithSubscription["subscription"];
      currentSubscribedPlan?: SubscriptionPlan;
      defaultVariant: PaidPlanVariants;
    };

function getInitialSelectedVariant(
  options: Props,
): FreePlanVariants | PaidPlanVariants {
  const { type, planGroup, defaultVariant } = options;
  const currentSubscribedPlanId = options.currentSubscription?.polarProductId;
  if (currentSubscribedPlanId === undefined) {
    return defaultVariant;
  }
  if (type === "free") {
    return planGroup.freePlan.polarProductId === currentSubscribedPlanId ?
        "free"
      : "custom";
  }

  return planGroup.monthlyPlan.polarProductId === currentSubscribedPlanId ?
      "month"
    : "year";
}

export function PlanCard(props: Props): JSX.Element {
  const { type, planGroup, currentSubscription, currentSubscribedPlan } = props;
  const router = useRouter();
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const [selectedVariant, setSelectedVariant] = useState<
    FreePlanVariants | PaidPlanVariants
  >(getInitialSelectedVariant(props));
  const openChangePlanModal = useChangePlanModal();
  const selectedPlan =
    type === "free" ?
      selectedVariant === "custom" ?
        (planGroup.payWhatYouWantPlan ?? planGroup.freePlan)
      : planGroup.freePlan
    : selectedVariant === "month" ? planGroup.monthlyPlan
    : planGroup.annualPlan;
  const { featurePlan } = selectedPlan;
  const [isLoadingCheckoutPage, setIsLoadingCheckoutPage] = useState(false);
  const isCurrentSubscribedPlan =
    currentSubscribedPlan?.polarProductId === selectedPlan.polarProductId;

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
    if (!userProfile || !workspace) {
      notifyExpiredSession();
      return;
    }
    const { userId, workspaceId, email } = userProfile;

    // if we have no current subscription, or the current plan is a free plan
    // (meaning any plan we select is going to be an upgrade), then we have to
    // take the user to the Polar checkout page.
    if (
      currentSubscription === undefined ||
      currentSubscribedPlan === undefined ||
      currentSubscribedPlan.priceType === "free"
    ) {
      const currentURL = getCurrentURL();
      const successURL = router.buildLocation({
        to: "/$workspaceSlug/checkout",
        params: { workspaceSlug: workspace.slug },
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
        currentPolarSubscriptionId: currentSubscription?.polarSubscriptionId,
        currentCustomerId: currentSubscription?.polarCustomerId,
        numSeats: selectedPlan.priceType === "seat_based" ? 1 : undefined,
      });
      return;
    }

    // otherwise, we are just updating the current from a paid plan to another
    // paid plan. Or paid plan to free plan. So we don't need to go through the
    // official Polar checkout page for that.
    openChangePlanModal({
      newPlan: selectedPlan,
      currentPlan: currentSubscribedPlan,
      currentSubscriptionId: currentSubscription.polarSubscriptionId,
    });
  };

  const elements = {
    planSwitch: () => {
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

              {paidPlanDiscount && selectedVariant === "year" ?
                <Badge color="green" variant="light" size="lg">
                  Save {paidPlanDiscount}%
                </Badge>
              : null}
            </Group>
            <Text size="sm" c="dimmed">
              {selectedPlan.description}
            </Text>
          </div>
        </Group>
        {elements.planSwitch()}
        {elements.priceRow()}
        {selectedVariant !== "free" ?
          <EarlySupporterCreditProgramBox />
        : null}
        <PlanFeatures features={featurePlan.metadata.features} />
        <Button
          variant={isCurrentSubscribedPlan ? "outline" : "filled"}
          fullWidth
          mt="auto"
          disabled={isCurrentSubscribedPlan}
          onClick={onSelectPlan}
          loading={isLoadingCheckoutPage}
        >
          {isCurrentSubscribedPlan ? "Current Plan" : "Select Plan"}
        </Button>
      </Stack>
    </Card>
  );
}
