import { Trans } from "@lingui/react/macro";
import { Divider, Stack, Text } from "@mantine/core";
import { formatNumber } from "@utils";
import { match } from "ts-pattern";
import { PlanFeatures } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/PlanFeatures";
import { SubscriptionPlan } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";
import { Paper } from "@ui";

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
              <Trans>Free</Trans>
            </Text>
          );
        })
        .with({ priceType: "custom" }, (p) => {
          return (
            <Text size="lg" fw={600}>
              <Trans>Pay What You Want</Trans>
              <Text component="span" size="sm" fw={400} c="dimmed" ml="xs">
                {p.planInterval === "month" ?
                  <Trans>(Monthly billing)</Trans>
                : <Trans>(Annual billing)</Trans>}
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
              <Trans>{formattedPrice}/seat</Trans>
              <Text component="span" size="sm" fw={400} c="dimmed" ml="xs">
                {p.planInterval === "year" ?
                  <Trans>/month (paid yearly)</Trans>
                : <Trans>/month</Trans>}
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
          <Trans>You are about to change your subscription plan to:</Trans>
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
          <Trans>Plan Features:</Trans>
        </Text>
        <PlanFeatures features={newPlan.featurePlan.metadata.features} />
      </Paper>

      <Paper shadow="xs" withBorder={false} bg="yellow.0">
        <Text c="yellow.9">
          {newPlan.priceType === "custom" ?
            <strong>
              <Trans>
                Upgrading to a &quot;Pay What You Want&quot; plan can only be
                done through the billing portal.
                <br />
                The button below will take you there.
              </Trans>
            </strong>
          : <Trans>
              Please confirm that you would like to proceed with this plan
              change. Your subscription will be updated accordingly.
            </Trans>
          }
        </Text>
      </Paper>
    </Stack>
  );
}
