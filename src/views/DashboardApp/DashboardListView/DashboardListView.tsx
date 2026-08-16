import { Model } from "@avandar/models";
import { Paper } from "@avandar/ui";
import { prop, where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconLayoutDashboard, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { collectDatasetIds } from "$/models/Dashboard/collectDatasetIds/collectDatasetIds";
import { DashboardConfigs } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { useMemo } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useIsTabletSize } from "@/lib/hooks/ui/useIsTabletSize";
import { notifyDevAlert } from "@/utils/notifications/notifyDevAlert";
import { DashboardCard } from "@/views/DashboardApp/DashboardListView/DashboardCard/DashboardCard";
import { sortDashboardsForList } from "@/views/DashboardApp/DashboardListView/sortDashboardsForList/sortDashboardsForList";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { UserId } from "$/models/User/User.types";

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
  const [workspaceDatasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const workspaceDatasetIds = workspaceDatasets.map(prop("id"));
  const [userProfile, isLoadingUserProfile] = useCurrentUserProfile();

  // Dataset ids with parquet cached locally for the current user/workspace.
  const userId = userProfile?.userId;
  const [localDatasets = []] = LocalDatasetClient.useGetAll({
    where: {
      userId: { eq: userId as UserId },
      workspaceId: { eq: workspace.id },
    },
    useQueryOptions: { enabled: !!userId },
  });
  const localDatasetIds = useMemo(() => {
    return new Set(localDatasets.map(prop("datasetId")));
  }, [localDatasets]);

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

  const orderedDashboards = useMemo(() => {
    return sortDashboardsForList({
      dashboards,
      currentUserId: userProfile?.userId,
    });
  }, [dashboards, userProfile?.userId]);

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
            {orderedDashboards.map((dashboard) => {
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
                  // Until the profile lands there is no owner to compare
                  // against, and the ambiguous answer has to be the quiet
                  // one: `false` would badge every card on the grid,
                  // including your own, and then un-badge them a tick later.
                  isOwnedByCurrentUser={
                    userProfile ?
                      dashboard.ownerId === userProfile.userId
                    : true
                  }
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
