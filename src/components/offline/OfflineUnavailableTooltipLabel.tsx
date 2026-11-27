import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";

/**
 * Renders the standard offline-unavailable tooltip message.
 * Use it, for example, to explain an offline-gated control.
 */
export function OfflineUnavailableTooltipLabel(): JSX.Element {
  return (
    <Stack gap={2}>
      <Text fw={600} size="sm" lh={1.3}>
        <Trans>Unavailable offline</Trans>
      </Text>
      <Text size="xs" c="neutral.3" lh={1.35}>
        <Trans>Return online to view or make the page available offline.</Trans>
      </Text>
    </Stack>
  );
}
