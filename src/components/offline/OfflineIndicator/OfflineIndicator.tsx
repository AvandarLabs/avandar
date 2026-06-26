import { Trans } from "@lingui/react/macro";
import { Group, Text } from "@mantine/core";
import { IconWifiOff } from "@tabler/icons-react";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";

/**
 * Compact offline status in the app toolbar (replaces the full-width banner).
 */
export function OfflineIndicator(): JSX.Element | null {
  const isOnline = useIsOnline();
  return isOnline ? null : (
      <Group gap={4} wrap="nowrap" aria-live="polite">
        <IconWifiOff size={14} stroke={1.5} aria-hidden />
        <Text size="xs" c="dimmed" fw={500}>
          <Trans>You are offline</Trans>
        </Text>
      </Group>
    );
}
