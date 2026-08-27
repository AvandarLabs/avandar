import { Trans } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";

type Props = {
  onRetry?: () => void;
  onRequestDifferentDiscovery?: () => void;
};

/** Renders actions for recovering from a failed discovery lookup. */
export function DiscoveryRecoveryActions({
  onRetry,
  onRequestDifferentDiscovery,
}: Readonly<Props>): React.ReactNode {
  return (
    <Group gap="xs" wrap="wrap">
      {onRetry ? (
        <Button size="xs" variant="light" onClick={onRetry}>
          <Trans>Retry lookup</Trans>
        </Button>
      ) : null}
      {onRequestDifferentDiscovery ? (
        <Button
          size="xs"
          variant="subtle"
          onClick={onRequestDifferentDiscovery}
        >
          <Trans>Try a different lookup</Trans>
        </Button>
      ) : null}
    </Group>
  );
}
