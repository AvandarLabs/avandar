import { Box, LoadingOverlay, Stack, Text, Title } from "@mantine/core";
import { Render as PuckPageRender } from "@puckeditor/core";
import { useEffect, useMemo } from "react";
import "@puckeditor/core/puck.css";
import { notifyError } from "@ui/notifications/notify";
import { Paper } from "@/lib/ui/Paper/Paper";
import { AvaPageGenericData } from "../AvaPage/AvaPage.types";
import { getVersionFromAvaPageData } from "../AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "../AvaPage/utils/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "../AvaPage/utils/upgradeAvaPageData";
import { getDashboardPuckConfig } from "../DashboardEditorView/getDashboardPuckConfig";
import { useEnsurePublishedDashboardDatasets } from "./useEnsurePublishedDashboardDatasets";
import type { Dashboard } from "$/models/Dashboard/Dashboard.types";

type Props = {
  dashboard: Dashboard;
};

export function DashboardViewerView({ dashboard }: Props): JSX.Element {
  const [isLoadingDatasets, loadingDatasetsError] =
    useEnsurePublishedDashboardDatasets(dashboard);

  const config = getDashboardPuckConfig({
    dashboardTitle: dashboard?.name ?? "Untitled dashboard",
    workspaceId: dashboard?.workspaceId,
  });

  const data = useMemo(() => {
    const dashboardConfigData =
      dashboard.config as unknown as AvaPageGenericData;
    const puckData = {
      ...dashboardConfigData,
      root: {
        ...dashboardConfigData.root,
        props: {
          ...dashboardConfigData.root.props,
          title: dashboard.name || "Untitled dashboard",
          schemaVersion: getVersionFromAvaPageData(dashboardConfigData),
        },
      },
    };
    return upgradeAvaPageData(puckData);
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

  const avaPageMetadata = useMemo(() => {
    return getAvaPageMetadataFromDashboard(dashboard);
  }, [dashboard]);

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
      <PuckPageRender config={config} data={data} metadata={avaPageMetadata} />
    </Box>
  );
}
