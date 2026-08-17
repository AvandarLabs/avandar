import { Model } from "@avandar/models";
import { prop, where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { DashboardConfigs } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { useMemo } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyDevAlert } from "@/utils/notifications/notifyDevAlert";
import { DashboardGrid } from "@/views/DashboardApp/DashboardListView/DashboardGrid";
import { DashboardListEmptyState } from "@/views/DashboardApp/DashboardListView/DashboardListEmptyState";
import { getDashboardOfflineStatus } from "@/views/DashboardApp/DashboardListView/getDashboardOfflineStatus";
import { sortDashboardsForList } from "@/views/DashboardApp/DashboardListView/sortDashboardsForList/sortDashboardsForList";
import type { DashboardOfflineStatus } from "@/views/DashboardApp/DashboardListView/DashboardCard/DashboardCard";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { UserId } from "$/models/User/User.types";
import type { UserProfile } from "$/models/User/UserProfile";
import type { ReactNode } from "react";

type Props = {
  dashboards: Dashboard.T[];
  workspaceSlug: string;
};

type DashboardListViewState = {
  orderedDashboards: Dashboard.T[];
  /** `undefined` until the current user's profile lands. */
  currentUserId: UserId | undefined;
  isCreatePending: boolean;
  isCreateDisabled: boolean;
  getOfflineStatus: (dashboard: Dashboard.T) => DashboardOfflineStatus;
  onCreateDashboard: () => void;
  onOpenDashboard: (dashboardId: string) => void;
};

/** A blank dashboard owned by the given profile, ready to insert. */
function _makeNewDashboard(
  options: Readonly<{
    workspaceId: Dashboard.T["workspaceId"];
    userProfile: UserProfile.T;
    name: string;
  }>,
): Dashboard.T<"Insert"> {
  const now = new Date();
  return Model.make("Dashboard", {
    workspaceId: options.workspaceId,
    ownerId: options.userProfile.userId,
    ownerProfileId: options.userProfile.profileId,
    name: options.name,
    description: undefined,
    slug: undefined,
    // TODO(jpsyx): avoid coercing the type here
    config: DashboardConfigs.makeEmpty() as unknown as Dashboard.T["config"],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

/** Queries, ordering and callbacks behind the dashboards grid. */
function useDashboardListViewState(
  options: Readonly<Props>,
): DashboardListViewState {
  const { dashboards, workspaceSlug } = options;
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [userProfile, isLoadingUserProfile] = useCurrentUserProfile();
  const userId = userProfile?.userId;

  const [workspaceDatasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  // Dataset ids with parquet cached locally for the current user/workspace.
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

  const onOpenDashboard = (dashboardId: string): void => {
    navigate({
      to: "/$workspaceSlug/dashboards/edit/$dashboardId",
      params: { workspaceSlug, dashboardId },
    });
  };

  // Creating one drops you straight into its editor, which is the same
  // destination a click on its card would reach.
  const [insertDashboard, isInsertDashboardPending] = DashboardClient.useInsert(
    {
      queryToInvalidate: DashboardClient.QueryKeys.getAll(),
      onSuccess: (createdDashboard) => {
        onOpenDashboard(createdDashboard.id);
      },
    },
  );

  const orderedDashboards = useMemo(() => {
    return sortDashboardsForList({ dashboards, currentUserId: userId });
  }, [dashboards, userId]);

  const workspaceDatasetIds = workspaceDatasets.map(prop("id"));

  return {
    orderedDashboards,
    currentUserId: userId,
    isCreatePending: isInsertDashboardPending,
    isCreateDisabled: isLoadingUserProfile,
    getOfflineStatus: (dashboard) => {
      return getDashboardOfflineStatus({
        dashboard,
        workspaceDatasetIds,
        localDatasetIds,
      });
    },
    onCreateDashboard: () => {
      if (!userProfile) {
        notifyDevAlert("User profile not loaded yet");
        return;
      }
      insertDashboard({
        data: _makeNewDashboard({
          workspaceId: workspace.id,
          userProfile,
          name: t`Untitled dashboard`,
        }),
      });
    },
    onOpenDashboard,
  };
}

/** The workspace's dashboards, as a grid of cards. */
export function DashboardListView({
  dashboards,
  workspaceSlug,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const state = useDashboardListViewState({ dashboards, workspaceSlug });

  return (
    <AppLayout
      title={t`Dashboards`}
      toolbarButtonSection={
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={state.onCreateDashboard}
          size="compact-sm"
          variant="light"
          loading={state.isCreatePending}
          disabled={state.isCreateDisabled}
        >
          <Trans>Create a dashboard</Trans>
        </Button>
      }
      containerProps={{ p: "md" }}
    >
      {dashboards.length === 0 ?
        <DashboardListEmptyState
          isCreatePending={state.isCreatePending}
          isCreateDisabled={state.isCreateDisabled}
          onCreateDashboard={state.onCreateDashboard}
        />
      : <DashboardGrid
          dashboards={state.orderedDashboards}
          currentUserId={state.currentUserId}
          getOfflineStatus={state.getOfflineStatus}
          onOpenDashboard={state.onOpenDashboard}
        />
      }
    </AppLayout>
  );
}
