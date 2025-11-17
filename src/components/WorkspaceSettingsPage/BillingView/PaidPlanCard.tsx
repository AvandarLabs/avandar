import { Badge, Box, Button, Card, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { SegmentedControl } from "@/lib/ui/inputs/SegmentedControl";
import { notifyExpiredSession } from "@/lib/ui/notifications/notifyExpiredSession";
import { formatNumber } from "@/lib/utils/formatters/formatNumber";
import { EarlySupporterCreditProgramBox } from "./EarlySupporterCreditProgramBox";
import { goToPolarCheckout } from "./goToPolarCheckout";
import { PlanFeatures } from "./PlanFeatures";
import {
  AnnualPaidSeatsPlan,
  FeaturePlan,
  MonthlyPaidSeatsPlan,
} from "./SubscriptionPlan.types";

type Props = {
  featurePlanName: string;
  monthlyPlan: MonthlyPaidSeatsPlan;
  annualPlan: AnnualPaidSeatsPlan;
  featurePlan: FeaturePlan;
  isCurrentPlan: boolean;
};

function calculateYearlyDiscount(options: {
  monthlyPlanPrice?: number;
  annualPlanPricePerMonth?: number;
}): number | undefined {
  const { monthlyPlanPrice, annualPlanPricePerMonth } = options;
  if (!monthlyPlanPrice || !annualPlanPricePerMonth || monthlyPlanPrice === 0) {
    return undefined;
  }
  const discount =
    ((monthlyPlanPrice - annualPlanPricePerMonth) / monthlyPlanPrice) * 100;
  return Math.round(discount);
}

/**
 * A card displaying a paid plan that allows the user to toggle between monthly
 * and yearly billing.
 */
export function PaidPlanCard({
  featurePlanName,
  monthlyPlan,
  annualPlan,
  featurePlan,
  isCurrentPlan,
}: Props): JSX.Element {
  const user = useCurrentUser();
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">(
    "year",
  );
  const selectedIntervalPlan =
    selectedInterval === "year" ? annualPlan : monthlyPlan;
  const formattedPriceToDisplay = formatNumber(
    selectedIntervalPlan.normalizedPricePerSeatPerMonth,
    {
      style: "currency",
      currency: selectedIntervalPlan?.priceCurrency.toUpperCase(),
    },
  );

  const discount = calculateYearlyDiscount({
    monthlyPlanPrice: monthlyPlan.normalizedPricePerSeatPerMonth,
    annualPlanPricePerMonth: annualPlan.normalizedPricePerSeatPerMonth,
  });

  const onSelectPlan = async () => {
    if (!user) {
      notifyExpiredSession();
      return;
    }
    await goToPolarCheckout({
      polarProductId: selectedIntervalPlan.polarProductId,
      userEmail: user.email,
      // request a checkout URL starting at a single seat. The user can change
      // this in the checkout page.
      numSeats: 1,
    });
  };

  return (
    <Card withBorder padding="lg" radius="md" style={{ flex: 1 }}>
      <Stack gap="md" h="100%">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" mb="xs">
              <Text fw={600} size="lg">
                {featurePlanName}
              </Text>
              {isCurrentPlan ?
                <Badge color="blue" variant="light">
                  Current Plan
                </Badge>
              : null}
              {discount && selectedInterval === "year" ?
                <Badge color="green" variant="light" size="lg">
                  Save {discount}%
                </Badge>
              : null}
            </Group>
            <Text size="sm" c="dimmed">
              {selectedIntervalPlan.description}
            </Text>
          </div>
        </Group>
        <SegmentedControl
          value={selectedInterval}
          onChange={(value) => {
            setSelectedInterval(value as "month" | "year");
          }}
          data={[
            { value: "year", label: "Pay yearly" },
            { value: "month", label: "Pay monthly" },
          ]}
          fullWidth
        />
        <Stack gap="xs">
          {discount && selectedInterval === "year" ?
            <Text size="sm" c="green" fw={500}>
              You save {discount}% compared to monthly billing
            </Text>
          : null}
          <Box w="100%">
            <Text size="xl" fw={600} mb="xs">
              {formattedPriceToDisplay}/seat
              <Text component="span" size="sm" fw={400} c="dimmed" ml="xs">
                /month
                {selectedInterval === "year" ? " (paid yearly)" : null}
              </Text>
            </Text>
          </Box>
        </Stack>
        <EarlySupporterCreditProgramBox />
        <PlanFeatures features={featurePlan.metadata.features} />
        <Button
          variant={isCurrentPlan ? "outline" : "filled"}
          fullWidth
          mt="auto"
          disabled={isCurrentPlan}
          onClick={onSelectPlan}
        >
          {isCurrentPlan ? "Current Plan" : "Select Plan"}
        </Button>
      </Stack>
    </Card>
  );
}
