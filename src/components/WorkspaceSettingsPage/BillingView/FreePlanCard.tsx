import { Badge, Box, Button, Card, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { SegmentedControl } from "@/lib/ui/inputs/SegmentedControl";
import { notifyExpiredSession } from "@/lib/ui/notifications/notifyExpiredSession";
import { EarlySupporterCreditProgramBox } from "./EarlySupporterCreditProgramBox";
import { goToPolarCheckout } from "./goToPolarCheckout";
import { PlanFeatures } from "./PlanFeatures";
import {
  FeaturePlan,
  FreePlan,
  MonthlyPayWhatYouWantPlan,
} from "./SubscriptionPlan.types";

type FreePlanCardProps = {
  basePlanName: string;
  freePlan: FreePlan;
  payWhatYouWantPlan?: MonthlyPayWhatYouWantPlan;
  isCurrentPlan: boolean;
  featurePlan: FeaturePlan;
};

export function FreePlanCard({
  basePlanName,
  freePlan,
  payWhatYouWantPlan,
  isCurrentPlan,
  featurePlan,
}: FreePlanCardProps): JSX.Element {
  const user = useCurrentUser();
  const [selectedPlanType, setSelectedPlanType] = useState<"free" | "custom">(
    payWhatYouWantPlan ? "custom" : "free",
  );
  const selectedPlan =
    selectedPlanType === "custom" ? payWhatYouWantPlan : freePlan;

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
            </Group>
            {selectedPlan?.description ?
              <Text size="sm" c="dimmed">
                {selectedPlan.description}
              </Text>
            : null}
          </div>
        </Group>

        {payWhatYouWantPlan ?
          <Box
            p="sm"
            style={{
              border: "2px solid",
              borderColor: "var(--mantine-color-blue-3)",
              borderRadius: "var(--mantine-radius-md)",
              backgroundColor: "var(--mantine-color-blue-0)",
            }}
          >
            <SegmentedControl
              value={selectedPlanType}
              onChange={(value) => {
                setSelectedPlanType(value as "free" | "custom");
              }}
              data={[
                { value: "custom", label: "Pay what you want" },
                { value: "free", label: "Free" },
              ]}
              fullWidth
            />
          </Box>
        : null}

        {selectedPlanType === "custom" && payWhatYouWantPlan ?
          <EarlySupporterCreditProgramBox />
        : null}

        {selectedPlanType === "free" ?
          <Text size="xl" fw={600}>
            Free
          </Text>
        : null}

        <PlanFeatures features={featurePlan.metadata.features} />
        <Button
          mt="auto"
          variant={isCurrentPlan ? "outline" : "filled"}
          fullWidth
          disabled={isCurrentPlan}
          onClick={async () => {
            if (!user) {
              notifyExpiredSession();
              return;
            }

            if (selectedPlan && user) {
              await goToPolarCheckout({
                polarProductId: selectedPlan.polarProductId,
                userEmail: user.email,
              });
            }
          }}
        >
          {isCurrentPlan ? "Current Plan" : "Select Plan"}
        </Button>
      </Stack>
    </Card>
  );
}
