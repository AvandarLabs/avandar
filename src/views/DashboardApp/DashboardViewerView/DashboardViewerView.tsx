import { Box, Button, Group, LoadingOverlay, Stack, Text, Title } from "@mantine/core";
import { Render as PuckPageRender } from "@puckeditor/core";
import { useNavigate } from "@tanstack/react-router";
import { IconArrowLeft, IconEye } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";
import "@puckeditor/core/puck.css";
import { notifyError, Paper  } from "@ui";
import { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { getDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/getDashboardPuckConfig";
import { useEnsurePublishedDashboardDatasets } from "@/views/DashboardApp/DashboardViewerView/useEnsurePublishedDashboardDatasets";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

type Props = {
  dashboard: Dashboard.T;
  /**
   * "public" (default) — render at the public route; enforce
   *   `dashboard.isPublic` before showing anything.
   * "preview" — auth-gated owner preview; skip the public gate and
   *   show a "Back to editor" banner. The viewer route at
   *   `/public/dashboards/...` never passes this; it's set only by
   *   the auth-gated `/dashboards/preview/...` route.
   */
  mode?: "public" | "preview";
  workspaceSlug?: string;
};

export function DashboardViewerView({
  dashboard,
  mode = "public",
  workspaceSlug,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const [isLoadingDatasets, loadingDatasetsError] =
    useEnsurePublishedDashboardDatasets(dashboard);

  const config = getDashboardPuckConfig({
    dashboardTitle: dashboard?.name ?? "Untitled dashboard",
    workspaceId: dashboard?.workspaceId,
    dashboardId: dashboard.id,
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

  if (mode === "public" && !dashboard.isPublic) {
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
      {mode === "preview" && workspaceSlug ?
        <Group
          gap="xs"
          justify="space-between"
          px="md"
          py="xs"
          style={{
            borderBottom: "1px solid var(--ava-border-default)",
            backgroundColor: "var(--mantine-color-blue-0)",
          }}
        >
          <Group gap="xs">
            <IconEye size={16} color="var(--mantine-color-blue-7)" />
            <Text size="sm" c="blue.9" fw={500}>
              Previewing this dashboard
            </Text>
            <Text size="xs" c="dimmed">
              {dashboard.isPublic ?
                "This dashboard is published publicly."
              : "Not yet published. Public viewers will not see this."}
            </Text>
          </Group>
          <Button
            size="compact-sm"
            variant="outline"
            color="neutral"
            leftSection={<IconArrowLeft size={14} />}
            onClick={() => {
              navigate({
                to: "/$workspaceSlug/dashboards/edit/$dashboardId",
                params: { workspaceSlug, dashboardId: dashboard.id },
              });
            }}
          >
            Back to editor
          </Button>
        </Group>
      : null}
      <PuckPageRender config={config} data={data} metadata={avaPageMetadata} />
    </Box>
  );
}
