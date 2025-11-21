import { Box, Stack, Text } from "@mantine/core";
import { formatNumber } from "@/lib/utils/formatters/formatNumber";
import {
  AnnualPaidSeatsPlan,
  MonthlyPaidSeatsPlan,
} from "../SubscriptionPlan.types";

type Props = {
  discount: number | undefined;
  plan: AnnualPaidSeatsPlan | MonthlyPaidSeatsPlan;
};

export function PaidPlanPriceRow({ discount, plan }: Props): JSX.Element {
  const formattedPriceToDisplay = formatNumber(
    plan.normalizedPricePerSeatPerMonth,
    {
      style: "currency",
      currency: plan.priceCurrency.toUpperCase(),
    },
  );
  return (
    <Stack gap="xs">
      {discount && plan.planInterval === "year" ?
        <Text size="sm" c="green" fw={500}>
          You save {discount}% compared to monthly billing
        </Text>
      : null}
      <Box w="100%">
        <Text size="xl" fw={600} mb="xs">
          {formattedPriceToDisplay}/seat
          <Text component="span" size="sm" fw={400} c="dimmed" ml="xs">
            /month
            {plan.planInterval === "year" ? " (paid yearly)" : null}
          </Text>
        </Text>
      </Box>
    </Stack>
  );
}
