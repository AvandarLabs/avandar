import { Box, SegmentedControl } from "@mantine/core";
import {
  FREE_CHOICES,
  isValidFreePlanVariant,
  isValidPaidPlanVariant,
  PAID_CHOICES,
} from "../planUtils";
import { FreePlanVariants, PaidPlanVariants } from "../SubscriptionPlan.types";

type Props = {
  withHighlight?: boolean;
} & (
  | {
      type: "free";
      value: FreePlanVariants;
      onChange: (value: FreePlanVariants) => void;
    }
  | {
      type: "paid";
      value: PaidPlanVariants;
      onChange: (value: PaidPlanVariants) => void;
    }
);

/**
 * A switch to toggle between variants in a plan group.
 * If the type is 'free', we switch between 'Free' and 'Pay what you want'.
 * If the type is 'paid', we switch between 'Monthly' and 'Yearly'.
 */
export function PlanSwitch({
  type,
  value,
  onChange,
  withHighlight = false,
}: Props): JSX.Element {
  const choices = type === "free" ? FREE_CHOICES : PAID_CHOICES;
  const segmentedControl = (
    <SegmentedControl
      fullWidth
      value={value}
      data={choices}
      onChange={(choice) => {
        if (type === "free" && isValidFreePlanVariant(choice)) {
          onChange(choice);
        } else if (type === "paid" && isValidPaidPlanVariant(choice)) {
          onChange(choice);
        }
      }}
    />
  );

  if (withHighlight) {
    return (
      <Box
        p="sm"
        style={{
          border: "2px solid",
          borderColor: "var(--mantine-color-blue-3)",
          borderRadius: "var(--mantine-radius-md)",
          backgroundColor: "var(--mantine-color-blue-0)",
        }}
      >
        {segmentedControl}
      </Box>
    );
  }
  return segmentedControl;
}
