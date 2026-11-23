import { Trans } from "@lingui/react/macro";
import { Group, Text } from "@mantine/core";
import { IconWifiOff } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  isOnline: boolean;
};

/**
 * Tells the member they are offline and their draft is safe. The status
 * region stays mounted while online, so going offline is announced.
 */
export function OfflineNotice({ isOnline }: Props): ReactNode {
  return (
    <div role="status">
      {isOnline ? null : (
        <Group gap="xs" px="sm" py={6} bg="neutral.1" wrap="nowrap">
          <IconWifiOff size={14} aria-hidden />
          <Text size="xs">
            <Trans>
              You're offline. Your draft is saved on this device and you can
              post when you reconnect.
            </Trans>
          </Text>
        </Group>
      )}
    </div>
  );
}
