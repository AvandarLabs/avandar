import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";

/**
 * Standard Notion-style offline tooltip copy for gated controls and links.
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
