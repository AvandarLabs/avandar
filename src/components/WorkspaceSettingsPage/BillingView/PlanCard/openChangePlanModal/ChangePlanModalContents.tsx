import { Divider, Stack, Text } from "@mantine/core";
import { match } from "ts-pattern";
import { Paper } from "@/lib/ui/Paper";
import { formatNumber } from "@/lib/utils/formatters/formatNumber";
import { PlanFeatures } from "../../PlanFeatures";
import { SubscriptionPlan } from "../../SubscriptionPlan.types";

type Props = {
  newPlan: SubscriptionPlan;
};

export function ChangePlanModalContents({ newPlan }: Props): JSX.Element {
  const elements = {
    priceInfo: () => {
      return match(newPlan)
        .with({ priceType: "free" }, () => {
          return (
            <Text size="lg" fw={600} c="dimmed">
              Free
            </Text>
          );
        })
        .with({ priceType: "custom" }, (p) => {
          return (
            <Text size="lg" fw={600}>
              Pay What You Want
              <Text component="span" size="sm" fw={400} c="dimmed" ml="xs">
                ({p.planInterval === "month" ? "Monthly" : "Annual"} billing)
              </Text>
            </Text>
          );
        })
        .with({ priceType: "seat_based" }, (p) => {
          const formattedPrice = formatNumber(
            p.normalizedPricePerSeatPerMonth,
            {
              style: "currency",
              currency: p.priceCurrency.toUpperCase(),
            },
          );
          return (
            <Text size="lg" fw={600}>
              {formattedPrice}/seat
              <Text component="span" size="sm" fw={400} c="dimmed" ml="xs">
                /month
                {p.planInterval === "year" ? " (paid yearly)" : null}
              </Text>
            </Text>
          );
        })
        .exhaustive();
    },
  };

  return (
    <Stack>
      <Paper noShadow bg="white">
        <Text size="sm" c="dimmed" mb="xs">
          You are about to change your subscription plan to:
        </Text>
        <Text size="xl" fw={700} mb="xs">
          {newPlan.featurePlan.metadata.featurePlanName}
        </Text>
        {newPlan.description ?
          <Text size="sm" c="dimmed" mb="md">
            {newPlan.description}
          </Text>
        : null}
        {elements.priceInfo()}

        <Divider my="md" />

        <Text size="sm" fw={600} mb="sm">
          Plan Features:
        </Text>
        <PlanFeatures features={newPlan.featurePlan.metadata.features} />
      </Paper>

      <Paper shadow="xs" withBorder={false} bg="yellow.0">
        <Text c="yellow.9">
          Please confirm that you would like to proceed with this plan change.
          Your subscription will be updated accordingly.
        </Text>
      </Paper>
    </Stack>
  );
}
