import { Trans } from "@lingui/react/macro";
import { Button, Center, Group, Stack, Text, Title } from "@mantine/core";
import { SessionRecovery } from "@/components/AppErrorBoundary/SessionRecovery/SessionRecovery";

/**
 * Manual recovery screen shown when the auto-recovery redirect loops. Offers a
 * plain re-sign-in and a harder reset that also clears cached assets.
 *
 * @returns The manual recovery screen.
 */
export function ManualRecoveryScreen(): React.ReactNode {
  return (
    <Center h="100vh" p="lg">
      <Stack align="center" gap="md" maw={440}>
        <Title order={3}>
          <Trans>Your session has expired</Trans>
        </Title>
        <Text c="dimmed" size="sm" ta="center">
          <Trans>
            Please sign in again to continue. If signing in does not work, reset
            the app to clear cached data and try once more.
          </Trans>
        </Text>
        <Group>
          <Button
            onClick={() => {
              void SessionRecovery.recover();
            }}
          >
            <Trans>Sign in again</Trans>
          </Button>
          <Button
            variant="default"
            onClick={() => {
              void SessionRecovery.resetAndRecover();
            }}
          >
            <Trans>Reset app</Trans>
          </Button>
        </Group>
      </Stack>
    </Center>
  );
}
