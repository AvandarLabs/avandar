import { Trans } from "@lingui/react/macro";
import { Alert, Text } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";

/** Explains the counts-only privacy boundary to workspace administrators. */
export function PrivateResourcesNotice(): React.ReactNode {
  return (
    <Alert
      color="blue"
      variant="light"
      icon={<IconLock size={16} aria-hidden />}
    >
      <Text size="sm">
        <Trans>
          Counts only. Private content is never visible to workspace admins. You
          can reassign ownership without gaining access.
        </Trans>
      </Text>
    </Alert>
  );
}
