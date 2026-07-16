import { Button, Center, Code, Group, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";

/**
 * Fallback UI for a non-auth error: a friendly message with retry / home
 * actions and a development-only details toggle. Kept separate so the technical
 * error text is never shown to end users in production.
 *
 * @param props.error - The caught error.
 * @param props.reset - Router-provided callback to retry rendering the route.
 * @returns The generic error UI.
 */
export function GenericError({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}): React.ReactNode {
  const [showDetails, setShowDetails] = useState(false);
  const message = error instanceof Error ? error.message : String(error);

  return (
    <Center h="100vh" p="lg">
      <Stack align="center" gap="md" maw={480}>
        <Title order={3}>Something went wrong</Title>
        <Text c="dimmed" size="sm" ta="center">
          An unexpected error occurred. You can try again, or return home.
        </Text>
        <Group>
          <Button onClick={reset}>Try again</Button>
          <Button
            variant="default"
            onClick={() => {
              window.location.assign("/");
            }}>
            Go home
          </Button>
        </Group>
        {import.meta.env.DEV ?
          <Stack gap="xs" w="100%">
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                setShowDetails((shown) => {
                  return !shown;
                });
              }}>
              {showDetails ? "Hide details" : "Show details"}
            </Button>
            {showDetails ?
              <Code block>{message}</Code>
            : null}
          </Stack>
        : null}
      </Stack>
    </Center>
  );
}
