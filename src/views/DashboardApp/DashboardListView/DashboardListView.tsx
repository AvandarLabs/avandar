import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Model } from "@models";
import { IconLayoutDashboard, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { notifyDevAlert, Paper } from "@ui";
import { prop, where } from "@utils";
import { collectDatasetIds } from "$/models/Dashboard/collectDatasetIds/collectDatasetIds";
import { DashboardConfigs } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsTabletSize } from "@/lib/hooks/ui/useIsTabletSize";
import { useLocalDatasetIds } from "@/lib/offline/useLocalDatasetIds";
import { DashboardCard } from "@/views/DashboardApp/DashboardListView/DashboardCard";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

type Props = {
  dashboards: Dashboard.T[];
  workspaceSlug: string;
};

export function DashboardListView({
  dashboards,
  workspaceSlug,
}: Props): JSX.Element {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const localDatasetIds = useLocalDatasetIds();
  const [workspaceDatasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const workspaceDatasetIds = workspaceDatasets.map(prop("id"));
  const [userProfile, isLoadingUserProfile] = useCurrentUserProfile();

  const getDashboardOfflineStatus = (
    dashboard: Dashboard.T,
  ): "full" | "partial" | "none" => {
    const referencedIds = collectDatasetIds(dashboard, workspaceDatasetIds);
    if (referencedIds.length === 0) {
      return "full";
    }
    const cachedCount = referencedIds.filter((datasetId) => {
      return localDatasetIds.has(datasetId);
    }).length;
    if (cachedCount === referencedIds.length) {
      return "full";
    }
    if (cachedCount === 0) {
      return "none";
    }
    return "partial";
  };
  const isTabletSize = useIsTabletSize() ?? false;
  const [insertDashboard, isInsertDashboardPending] = DashboardClient.useInsert(
    {
      queryToInvalidate: DashboardClient.QueryKeys.getAll(),
      onSuccess: (createdDashboard) => {
        navigate({
          to: "/$workspaceSlug/dashboards/edit/$dashboardId",
          params: {
            workspaceSlug,
            dashboardId: createdDashboard.id,
          },
        });
      },
    },
  );

  const isEmpty = dashboards.length === 0;

  const onCreateDashboard = () => {
    if (!userProfile) {
      notifyDevAlert("User profile not loaded yet");
      return;
    }

    const now = new Date();
    insertDashboard({
      data: Model.make("Dashboard", {
        workspaceId: workspace.id,
        ownerId: userProfile.userId,
        ownerProfileId: userProfile.profileId,
        name: t`Untitled dashboard`,
        description: undefined,
        slug: undefined,
        isPublic: false,
        // TODO(jpsyx): avoid coercing the type here
        config:
          DashboardConfigs.makeEmpty() as unknown as Dashboard.T["config"],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }),
    });
  };

  const elements = {
    emptyList() {
      return (
        <Paper p="xxl" maw={720} mx="auto">
          <Stack gap="lg" align="center" ta="center">
            <ThemeIcon
              size={isTabletSize ? 48 : 64}
              radius="xl"
              variant="light"
            >
              <IconLayoutDashboard size={isTabletSize ? 24 : 32} stroke={1.5} />
            </ThemeIcon>

            <Stack gap="xs">
              <Title order={2} fw={650}>
                <Trans>You have not created any dashboards</Trans>
              </Title>
              <Text c="dimmed">
                <Trans>
                  Create your first dashboard to track key metrics and insights.
                </Trans>
              </Text>
            </Stack>

            <Button
              leftSection={<IconPlus size={18} />}
              onClick={onCreateDashboard}
              size="md"
              loading={isInsertDashboardPending}
              disabled={isLoadingUserProfile}
            >
              <Trans>Create a dashboard</Trans>
            </Button>
          </Stack>
        </Paper>
      );
    },

    mainContent() {
      return (
        <Stack gap="lg">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {dashboards.map((dashboard) => {
              const onCardClick = () => {
                navigate({
                  to: "/$workspaceSlug/dashboards/edit/$dashboardId",
                  params: {
                    workspaceSlug,
                    dashboardId: dashboard.id,
                  },
                });
              };

              return (
                <DashboardCard
                  key={dashboard.id}
                  dashboard={dashboard}
                  offlineStatus={getDashboardOfflineStatus(dashboard)}
                  onClick={onCardClick}
                />
              );
            })}
          </SimpleGrid>
        </Stack>
      );
    },
  };

  return (
    <AppLayout
      title={t`Dashboards`}
      toolbarButtonSection={
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={onCreateDashboard}
          size="compact-sm"
          variant="light"
          loading={isInsertDashboardPending}
          disabled={isLoadingUserProfile}
        >
          <Trans>Create a dashboard</Trans>
        </Button>
      }
      containerProps={{
        p: "md",
      }}
    >
      {isEmpty ? elements.emptyList() : elements.mainContent()}
    </AppLayout>
  );
}
