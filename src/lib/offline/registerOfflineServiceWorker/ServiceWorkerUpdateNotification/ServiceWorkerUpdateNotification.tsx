import { Trans } from "@lingui/react/macro";
import { Button, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  onUpdate: () => void;
};

/**
 * Content for the "new version available" notification. Stays on screen
 * until the user either clicks the button or closes it themselves; it never
 * reloads the page on its own.
 */
export function ServiceWorkerUpdateNotification({
  onUpdate,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap="xs">
      <Text size="sm">
        <Trans>
          A new version is ready. Update now, or close this and update later.
        </Trans>
      </Text>
      <Button size="compact-sm" onClick={onUpdate}>
        <Trans>Update now</Trans>
      </Button>
    </Stack>
  );
}
