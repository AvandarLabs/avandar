import { Box, Text } from "@mantine/core";
import { formatNumber } from "@/lib/utils/formatters/formatNumber";

type Props = {
  basePrice?: {
    value: number;
    currency: string;
    planInterval: "month" | "year";
  };
  size?: "sm" | "md" | "lg";
};

export function EarlySupporterCreditProgramBox({
  basePrice,
  size = "md",
}: Props): JSX.Element {
  const formattedBasePrice =
    basePrice ?
      formatNumber(basePrice.value, {
        style: "currency",
        currency: basePrice.currency.toUpperCase(),
      })
    : "";
  return (
    <Box
      p="md"
      style={{
        backgroundColor: "var(--mantine-color-gray-0)",
        borderRadius: "var(--mantine-radius-md)",
      }}
    >
      <Text size={size} fw={500} mb="xs">
        🎉 Early Supporter Credit Program
      </Text>
      <Text size={size} c="dimmed">
        For every dollar you contribute{" "}
        <strong>
          {basePrice ?
            `above ${formattedBasePrice}/${basePrice.planInterval}`
          : ""}
        </strong>{" "}
        during Avandar's beta phase, you'll receive $1 in credit towards any
        plan once we fully launch. Your support now secures future savings!
      </Text>
    </Box>
  );
}
