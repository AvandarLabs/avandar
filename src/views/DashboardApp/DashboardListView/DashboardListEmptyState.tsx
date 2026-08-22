import { Paper } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Button, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconLayoutDashboard, IconPlus } from "@tabler/icons-react";
import { useIsTabletSize } from "@/lib/hooks/ui/useIsTabletSize";
import type { ReactNode } from "react";

type Props = {
  isCreatePending: boolean;
  /** True while the profile the new dashboard would be owned by is loading. */
  isCreateDisabled: boolean;
  onCreateDashboard: () => void;
};

/**
 * What the dashboards grid shows when the workspace has none.
 *
 * It owns its own breakpoint read rather than taking a prop: the tablet sizing
 * only ever applies to this illustration, so the list above it has no reason
 * to know the viewport width.
 */
export function DashboardListEmptyState({
  isCreatePending,
  isCreateDisabled,
  onCreateDashboard,
}: Readonly<Props>): ReactNode {
  const isTabletSize = useIsTabletSize() ?? false;
  return (
    <Paper p="xxl" maw={720} mx="auto">
      <Stack gap="lg" align="center" ta="center">
        <ThemeIcon size={isTabletSize ? 48 : 64} radius="xl" variant="light">
          <IconLayoutDashboard size={isTabletSize ? 24 : 32} stroke={1.5} />
        </ThemeIcon>

        <Stack gap="xs">
          <Title order={2} fw={650}>
            <Trans>No dashboards to show</Trans>
          </Title>
          <Text c="dimmed">
            <Trans>
              Nothing has been created or shared with you yet. Create a
              dashboard to track key metrics and insights.
            </Trans>
          </Text>
        </Stack>

        <Button
          leftSection={<IconPlus size={18} />}
          onClick={onCreateDashboard}
          size="md"
          loading={isCreatePending}
          disabled={isCreateDisabled}
        >
          <Trans>Create a dashboard</Trans>
        </Button>
      </Stack>
    </Paper>
  );
}
