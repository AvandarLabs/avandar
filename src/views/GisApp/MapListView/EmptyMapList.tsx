import { useLingui } from "@lingui/react/macro";
import { Paper, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

/** Explains what maps contain when a workspace has none. */
export function EmptyMapList(): ReactNode {
  const { t } = useLingui();
  return (
    <Paper p="xxl" maw={720} mx="auto">
      <Stack gap="lg" align="center" ta="center">
        <Stack gap="xs">
          <Title order={2} fw={650}>
            {t`No maps yet`}
          </Title>
          <Text c="dimmed">
            {t`A map plots your datasets, derived datasets, and profiles as layers you can style, save, and share.`}
          </Text>
        </Stack>
      </Stack>
    </Paper>
  );
}
