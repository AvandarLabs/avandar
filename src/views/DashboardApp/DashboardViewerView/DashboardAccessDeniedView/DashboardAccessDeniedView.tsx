import { Paper } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Props = {
  /** Whether the viewer can offer a sign-in link to switch accounts. */
  canSwitchAccount?: boolean;
};

/** Renders the shared explanation for a dashboard the viewer cannot access. */
export function DashboardAccessDeniedView({
  canSwitchAccount = false,
}: Readonly<Props>): ReactNode {
  return (
    <Paper p="xxl" maw={720} mx="auto">
      <Stack gap="xs">
        <Title order={2} fw={650}>
          <Trans>You need access</Trans>
        </Title>
        <Text c="dimmed">
          <Trans>Ask the dashboard's owner to share it with you.</Trans>
        </Text>
        {canSwitchAccount ? (
          <Group mt="md">
            <Button component={Link} to="/signin" variant="outline">
              <Trans>Sign in with a different account</Trans>
            </Button>
          </Group>
        ) : null}
      </Stack>
    </Paper>
  );
}
