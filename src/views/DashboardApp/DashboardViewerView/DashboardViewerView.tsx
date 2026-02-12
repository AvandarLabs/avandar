import { Box, LoadingOverlay, Stack, Text, Title } from "@mantine/core";
import { Render as PuckPageRender } from "@puckeditor/core";
import { useEffect, useMemo } from "react";
import "@puckeditor/core/puck.css";
import { notifyError } from "@/lib/ui/notifications/notify";
import { Paper } from "@/lib/ui/Paper";
import { getDashboardPuckConfig } from "../DashboardEditorView/getDashboardPuckConfig";
import { getVersionFromConfigData } from "../DashboardEditorView/migrations/getVersionFromConfigData";
import { DashboardGenericData } from "../DashboardEditorView/utils/puck.types";
import { upgradePuckConfig } from "../DashboardEditorView/utils/upgradePuckConfig";
import { useEnsurePublishedDashboardDatasets } from "./useEnsurePublishedDashboardDatasets";
import type { Dashboard } from "@/models/Dashboard/Dashboard.types";

type Props = {
  dashboard: Dashboard | undefined;
};

export function DashboardViewerView({ dashboard }: Props): JSX.Element {
  const [isLoadingDatasets, loadingDatasetsError] =
    useEnsurePublishedDashboardDatasets(dashboard);

  const config = getDashboardPuckConfig({
    dashboardTitle: dashboard?.name ?? "Untitled dashboard",
    workspaceId: dashboard?.workspaceId,
  });

  const data = useMemo(() => {
    if (!dashboard) {
      return {
        root: {
          props: {
            title: "Untitled dashboard",
          },
        },
        content: [],
      };
    }
    const dashboardConfigData =
      dashboard.config as unknown as DashboardGenericData;
    const puckData = {
      ...dashboardConfigData,
      root: {
        ...dashboardConfigData.root,
        props: {
          ...dashboardConfigData.root.props,
          title: dashboard.name || "Untitled dashboard",
          schemaVersion: getVersionFromConfigData(dashboardConfigData),
        },
      },
    };
    return upgradePuckConfig(puckData);
  }, [dashboard]);

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
      <PuckPageRender config={config} data={data} />
    </Box>
  );
}
