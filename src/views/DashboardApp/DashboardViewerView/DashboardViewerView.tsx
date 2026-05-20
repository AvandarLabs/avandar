import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  Button,
  Group,
  LoadingOverlay,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Render as PuckPageRender } from "@puckeditor/core";
import { IconArrowLeft, IconEye } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import "@puckeditor/core/puck.css";
import { notifyError, Paper } from "@ui";
import { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { getDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/getDashboardPuckConfig";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
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
  const { t } = useLingui();
  const navigate = useNavigate();
  const [isLoadingDatasets, loadingDatasetsError] =
    useEnsurePublishedDashboardDatasets(dashboard);

  const config = getDashboardPuckConfig({
    dashboardTitle: dashboard?.name ?? "Untitled dashboard",
    workspaceId: dashboard?.workspaceId,
    dashboardId: dashboard.id,
    t,
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
      title: t`Unable to load dashboard datasets`,
      message: loadingDatasetsError.message,
    });
  }, [loadingDatasetsError, t]);

  const avaPageMetadata = useMemo(() => {
    return getAvaPageMetadataFromDashboard(dashboard);
  }, [dashboard]);

  if (mode === "public" && !dashboard.isPublic) {
    return (
      <Paper p="xxl" maw={720} mx="auto">
        <Stack gap="xs">
          <Title order={2} fw={650}>
            <Trans>You do not have access to this dashboard</Trans>
          </Title>
          <Text c="dimmed">
            <Trans>
              This dashboard is private. This dashboard has not been made
              publicly viewable.
            </Trans>
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
            <Trans>Loading dashboard datasets</Trans>
          </Title>
          <Text c="dimmed">
            <Trans>Preparing data for the visualizations…</Trans>
          </Text>
        </Stack>
      </Paper>
    );
  }

  if (loadingDatasetsError) {
    return (
      <Paper p="xxl" maw={720} mx="auto">
        <Stack gap="xs">
          <Title order={2} fw={650}>
            <Trans>Unable to load dashboard</Trans>
          </Title>
          <Text c="dimmed">
            <Trans>
              Some published datasets could not be loaded. Please try again
              later.
            </Trans>
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <DashboardFilterStateManager.Provider>
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
                <Trans>Previewing this dashboard</Trans>
              </Text>
              <Text size="xs" c="dimmed">
                {dashboard.isPublic ?
                  <Trans>This dashboard is published publicly.</Trans>
                : <Trans>
                    Not yet published. Public viewers will not see this.
                  </Trans>
                }
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
              <Trans>Back to editor</Trans>
            </Button>
          </Group>
        : null}
        <PuckPageRender
          config={config}
          data={data}
          metadata={avaPageMetadata}
        />
      </Box>
    </DashboardFilterStateManager.Provider>
  );
}
