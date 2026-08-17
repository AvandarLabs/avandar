import { Trans } from "@lingui/react/macro";
import { Group, Loader, Text } from "@mantine/core";

/** Renders neutral progress while local discovery is running. */
export function DiscoveryLoadingBody(): React.ReactNode {
  return (
    <Group gap="xs" role="status" aria-live="polite">
      <Loader size="xs" />
      <Text size="xs" c="dimmed">
        <Trans>Checking your data…</Trans>
      </Text>
    </Group>
  );
}
