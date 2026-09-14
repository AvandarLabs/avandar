import { Trans } from "@lingui/react/macro";
import { Button, Center, Code, Group, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";

type Props = {
  /** The caught error. */
  error: unknown;
  /** Router-provided callback to retry rendering the route. */
  reset: () => void;
};

/**
 * Fallback UI for a non-auth error: a friendly message with retry / home
 * actions and a development-only details toggle. Kept separate so the technical
 * error text is never shown to end users in production.
 *
 * @returns The generic error UI.
 */
export function GenericError({ error, reset }: Props): React.ReactNode {
  const [showDetails, setShowDetails] = useState(false);
  const message = error instanceof Error ? error.message : String(error);

  return (
    <Center h="100vh" p="lg">
      <Stack align="center" gap="md" maw={480}>
        <Title order={3}>
          <Trans>Something went wrong</Trans>
        </Title>
        <Text c="dimmed" size="sm" ta="center">
          <Trans>
            An unexpected error occurred. You can try again, or return home.
          </Trans>
        </Text>
        <Group>
          <Button onClick={reset}>
            <Trans>Try again</Trans>
          </Button>
          <Button
            variant="default"
            onClick={() => {
              window.location.assign("/");
            }}
          >
            <Trans>Go home</Trans>
          </Button>
        </Group>
        {import.meta.env.DEV ? (
          <Stack gap="xs" w="100%">
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                setShowDetails((shown) => {
                  return !shown;
                });
              }}
            >
              {showDetails ? (
                <Trans>Hide details</Trans>
              ) : (
                <Trans>Show details</Trans>
              )}
            </Button>
            {showDetails ? <Code block>{message}</Code> : null}
          </Stack>
        ) : null}
      </Stack>
    </Center>
  );
}
