import { formatNumber } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Box, Stack, Text } from "@mantine/core";
import type {
  AnnualPaidSeatsPlan,
  MonthlyPaidSeatsPlan,
} from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";

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
      {discount && plan.planInterval === "year" ? (
        <Text size="sm" c="green" fw={500}>
          <Trans>You save {discount}% compared to monthly billing</Trans>
        </Text>
      ) : null}
      <Box w="100%">
        <Text size="xl" fw={600} mb="xs">
          <Trans>{formattedPriceToDisplay}/seat</Trans>
          <Text component="span" size="sm" fw={400} c="dimmed" ml="xs">
            {plan.planInterval === "year" ? (
              <Trans>/month (paid yearly)</Trans>
            ) : (
              <Trans>/month</Trans>
            )}
          </Text>
        </Text>
      </Box>
    </Stack>
  );
}
