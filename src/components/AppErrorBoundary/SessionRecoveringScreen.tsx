import { Trans } from "@lingui/react/macro";
import { Center, Stack, Text, Title } from "@mantine/core";

/**
 * Transient state shown while an expired session is being cleared and the user
 * is redirected to sign-in.
 *
 * @returns The "signing back in" screen.
 */
export function SessionRecoveringScreen(): React.ReactNode {
  return (
    <Center h="100vh" p="lg">
      <Stack align="center" gap="xs">
        <Title order={3}>
          <Trans>Signing you back in…</Trans>
        </Title>
        <Text c="dimmed" size="sm" ta="center">
          <Trans>Your session has expired. Redirecting you to sign in.</Trans>
        </Text>
      </Stack>
    </Center>
  );
}
