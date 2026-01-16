import { Box, Stack, Text, Title } from "@mantine/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { Paper } from "@/lib/ui/Paper";
import {
  getDashboardPuckConfig,
  getInitialDashboardPuckData,
} from "../DashboardEditorView/getDashboardPuckConfig";
import type { Dashboard } from "@/models/Dashboard/Dashboard.types";

type Props = {
  dashboard: Dashboard | undefined;
};

export function DashboardViewerView({ dashboard }: Props): JSX.Element {
  if (!dashboard) {
    return (
      <Paper p="xxl" maw={720} mx="auto">
        <Stack gap="xs">
          <Title order={2} fw={650}>
            Dashboard not found
          </Title>
          <Text c="dimmed">
            The dashboard you requested could not be found.
          </Text>
        </Stack>
      </Paper>
    );
  }

  if (!dashboard.isPublic) {
    return (
      <Paper p="xxl" maw={720} mx="auto">
        <Stack gap="xs">
          <Title order={2} fw={650}>
            You do not have access to this dashboard
          </Title>
          <Text c="dimmed">
            This dashboard is private. This dashboard has not been made publicly
            viewable.
          </Text>
        </Stack>
      </Paper>
    );
  }

  const config = getDashboardPuckConfig({
    dashboardTitle: dashboard.name,
    workspaceId: dashboard.workspaceId,
  });

  const data = getInitialDashboardPuckData({ dashboard });

  return (
    <Box>
      <Render config={config} data={data} />
    </Box>
  );
}
