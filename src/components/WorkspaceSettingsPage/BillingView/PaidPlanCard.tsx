import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { useState } from "react";
import { SegmentedControl } from "@/lib/ui/inputs/SegmentedControl";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { formatNumber } from "@/lib/utils/formatters/formatNumber";
import { EarlySupporterCreditProgramBox } from "./EarlySupporterCreditProgramBox";
import { PlanFeatures } from "./PlanFeatures";
import {
  AnnualPaidSeatsPlan,
  AnnualPayWhatYouWantPlan,
  FeaturePlan,
  MonthlyPaidSeatsPlan,
  MonthlyPayWhatYouWantPlan,
} from "./SubscriptionPlan.types";

type Props = {
  basePlanName: string;
  monthlyPlan: MonthlyPaidSeatsPlan;
  annualPlan: AnnualPaidSeatsPlan;
  monthlyPayWhatYouWantPlan?: MonthlyPayWhatYouWantPlan;
  annualPayWhatYouWantPlan?: AnnualPayWhatYouWantPlan;
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
  basePlanName,
  monthlyPlan,
  annualPlan,
  featurePlan,
  isCurrentPlan,
}: Props): JSX.Element {
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">(
    "year",
  );
  const selectedPlan = selectedInterval === "year" ? annualPlan : monthlyPlan;
  const formattedPriceToDisplay = formatNumber(
    selectedPlan.normalizedPricePerSeatPerMonth,
    {
      style: "currency",
      currency: selectedPlan?.priceCurrency.toUpperCase(),
    },
  );

  const discount = calculateYearlyDiscount({
    monthlyPlanPrice: monthlyPlan.normalizedPricePerSeatPerMonth,
    annualPlanPricePerMonth: annualPlan.normalizedPricePerSeatPerMonth,
  });

  return (
    <Card withBorder padding="lg" radius="md" style={{ flex: 1 }}>
      <Stack gap="md" h="100%">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" mb="xs">
              <Text fw={600} size="lg">
                {basePlanName}
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
              {selectedPlan.description}
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
            <Button
              variant="outline"
              fullWidth
              fz="md"
              onClick={() => {
                modals.open({
                  title: (
                    <Title
                      order={2}
                    >{`${basePlanName}: Early Supporter`}</Title>
                  ),
                  size: 600,
                  children: (
                    <Stack>
                      <EarlySupporterCreditProgramBox
                        size="md"
                        basePrice={{
                          value: selectedPlan.pricePerSeat / 100,
                          currency: selectedPlan.priceCurrency,
                          planInterval: selectedInterval,
                        }}
                      />
                      <Button size="xl">
                        Select {basePlanName}: Early Supporter
                      </Button>
                    </Stack>
                  ),
                });
              }}
            >
              Or pay what you want
            </Button>
          </Box>
        </Stack>
        <PlanFeatures features={featurePlan.metadata.features} />
        <Button
          variant={isCurrentPlan ? "outline" : "filled"}
          fullWidth
          mt="auto"
          disabled={isCurrentPlan}
          onClick={() => {
            notifyDevAlert(
              `Select plan clicked: ${basePlanName} (${selectedInterval})`,
            );
          }}
        >
          {isCurrentPlan ? "Current Plan" : "Select Plan"}
        </Button>
      </Stack>
    </Card>
  );
}
