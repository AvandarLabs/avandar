import { Group, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

type PlanFeaturesProps = {
  features: readonly string[];
};

export function PlanFeatures({ features }: PlanFeaturesProps): JSX.Element {
  return (
    <Stack gap="xs">
      {features.map((feature, index) => {
        return (
          <Group key={index} gap="xs" align="flex-start" w="100%" wrap="nowrap">
            <IconCheck size={16} style={{ marginTop: 2 }} />
            <Text size="sm">{feature}</Text>
          </Group>
        );
      })}
    </Stack>
  );
}
