import { Button, Center, Group, Stack, Text, Title } from "@mantine/core";
import {
  recoverFromSessionError,
  resetAppAndRecover,
} from "@/components/AppErrorBoundary/recoverFromSessionError";

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
        <Title order={3}>Your session has expired</Title>
        <Text c="dimmed" size="sm" ta="center">
          Please sign in again to continue. If signing in does not work, reset
          the app to clear cached data and try once more.
        </Text>
        <Group>
          <Button
            onClick={() => {
              void recoverFromSessionError();
            }}
          >
            Sign in again
          </Button>
          <Button
            variant="default"
            onClick={() => {
              void resetAppAndRecover();
            }}
          >
            Reset app
          </Button>
        </Group>
      </Stack>
    </Center>
  );
}
