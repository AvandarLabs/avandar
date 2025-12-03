import { Drawer, Flex, Stack, Text } from "@mantine/core";

type Props = {
  opened: boolean;
  onClose: () => void;
  feature: GeoJSON.Feature | null;
};

export function GeometryDrawer({
  opened,
  onClose,
  feature,
}: Props): JSX.Element {
  const properties = feature?.properties ?? {};

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Data Point"
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
                {value != null ? String(value) : "N/A"}
              </Text>
            </Flex>
          );
        })}
      </Stack>
    </Drawer>
  );
}
