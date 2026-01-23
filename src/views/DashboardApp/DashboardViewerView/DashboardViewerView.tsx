import { Box, LoadingOverlay, Stack, Text, Title } from "@mantine/core";
import { Render } from "@puckeditor/core";
import { useEffect } from "react";
import "@puckeditor/core/puck.css";
import { notifyError } from "@/lib/ui/notifications/notify";
import { Paper } from "@/lib/ui/Paper";
import {
  getDashboardPuckConfig,
  getInitialDashboardPuckData,
} from "../DashboardEditorView/getDashboardPuckConfig";
import { useEnsurePublishedDashboardDatasets } from "./useEnsurePublishedDashboardDatasets";
import type { Dashboard } from "@/models/Dashboard/Dashboard.types";

type Props = {
  dashboard: Dashboard | undefined;
};

export function DashboardViewerView({ dashboard }: Props): JSX.Element {
  const [isLoadingDatasets, loadingDatasetsError] =
    useEnsurePublishedDashboardDatasets(dashboard);

  useEffect(() => {
    if (!loadingDatasetsError) {
      return;
    }

    notifyError({
      title: "Unable to load dashboard datasets",
      message: loadingDatasetsError.message,
    });
  }, [loadingDatasetsError]);

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

  if (isLoadingDatasets) {
    return (
      <Paper p="xxl" maw={720} mx="auto" pos="relative">
        <LoadingOverlay visible />
        <Stack gap="xs">
          <Title order={2} fw={650}>
            Loading dashboard datasets
          </Title>
          <Text c="dimmed">Preparing data for the visualizations…</Text>
        </Stack>
      </Paper>
    );
  }

  if (loadingDatasetsError) {
    return (
      <Paper p="xxl" maw={720} mx="auto">
        <Stack gap="xs">
          <Title order={2} fw={650}>
            Unable to load dashboard
          </Title>
          <Text c="dimmed">
            Some published datasets could not be loaded. Please try again later.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Box>
      <Render config={config} data={data} />
    </Box>
  );
}
