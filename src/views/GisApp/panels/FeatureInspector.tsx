import { useLingui } from "@lingui/react/macro";
import { Drawer, Flex, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  opened: boolean;
  onClose: () => void;
  feature: GeoJSON.Feature | undefined;
};

/**
 * Side drawer listing every property of the map feature the user clicked.
 * Renders an empty list when no feature is selected.
 */
export function FeatureInspector({
  opened,
  onClose,
  feature,
}: Props): ReactNode {
  const { t } = useLingui();
  const properties = feature?.properties ?? {};

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={t`Feature`}
      position="right"
      withOverlay={false}
      closeOnClickOutside={false}
      size="xs"
      styles={{
        header: {
          marginBottom: 12,
        },
        content: {
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow:
            "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
        },
      }}
    >
      <Stack gap="md">
        {Object.entries(properties).map(([key, value]) => {
          if (key === "_featureId") {
            return null;
          }
          return (
            <Flex key={key} justify="space-between" align="center">
              <Text size="sm" fw={500} c="dimmed">
                {key}:
              </Text>
              <Text size="sm" fw={500}>
                {value != null ? String(value) : t`N/A`}
              </Text>
            </Flex>
          );
        })}
      </Stack>
    </Drawer>
  );
}
