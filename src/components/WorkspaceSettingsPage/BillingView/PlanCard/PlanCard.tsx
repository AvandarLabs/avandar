import { Badge, Button, Card, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { match } from "ts-pattern";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { notifyExpiredSession } from "@/lib/ui/notifications/notifyExpiredSession";
import { EarlySupporterCreditProgramBox } from "../EarlySupporterCreditProgramBox";
import { goToPolarCheckout } from "../goToPolarCheckout";
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
} from "../SubscriptionPlan.types";
import { PaidPlanPriceRow } from "./PaidPlanPriceRow";
import { PlanSwitch } from "./PlanVariantSwitch";

type Props =
  | {
      type: "free";
      planGroup: FreeSubscriptionPlanGroup;
      currentSubscribedPlanId: string | undefined;
      defaultVariant: FreePlanVariants;
    }
  | {
      type: "paid";
      planGroup: PaidSubscriptionPlanGroup;
      currentSubscribedPlanId: string | undefined;
      defaultVariant: PaidPlanVariants;
    };

function getInitialSelectedVariant(
  options: Props,
): FreePlanVariants | PaidPlanVariants {
  const { type, planGroup, currentSubscribedPlanId, defaultVariant } = options;
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
  const { type, planGroup, currentSubscribedPlanId } = props;
  const [userProfile] = useCurrentUserProfile();
  const [selectedVariant, setSelectedVariant] = useState<
    FreePlanVariants | PaidPlanVariants
  >(getInitialSelectedVariant(props));

  const selectedPlan =
    type === "free" ?
      selectedVariant === "custom" ?
        (planGroup.payWhatYouWantPlan ?? planGroup.freePlan)
      : planGroup.freePlan
    : selectedVariant === "month" ? planGroup.monthlyPlan
    : planGroup.annualPlan;
  const { featurePlan } = selectedPlan;
  const [isLoadingCheckoutPage, setIsLoadingCheckoutPage] = useState(false);

  const paidPlanDiscount =
    type === "paid" ?
      calculateYearlyDiscount({
        monthlyPlanPrice: planGroup.monthlyPlan.normalizedPricePerSeatPerMonth,
        annualPlanPricePerMonth:
          planGroup.annualPlan.normalizedPricePerSeatPerMonth,
      })
    : undefined;

  const onSelectPlan = async () => {
    if (!userProfile) {
      notifyExpiredSession();
      return;
    }
    const { userId, workspaceId, email } = userProfile;
    setIsLoadingCheckoutPage(true);
    await goToPolarCheckout({
      polarProductId: selectedPlan.polarProductId,
      userId,
      workspaceId,
      userEmail: email,
      // request a checkout URL starting at a single seat. The user can change
      // this in the checkout page.
      numSeats: selectedPlan.priceType === "seat_based" ? 1 : undefined,
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

  const isCurrentSubscribedPlan =
    currentSubscribedPlanId === selectedPlan.polarProductId;

  return (
    <Card withBorder padding="lg" radius="md" style={{ flex: 1 }}>
      <Stack gap="md" h="100%">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" mb="xs">
              <Text fw={600} size="lg">
                {featurePlan.metadata.featurePlanName}
              </Text>
              {isCurrentSubscribedPlan ?
                <Badge color="blue" variant="light">
                  Current Plan
                </Badge>
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
