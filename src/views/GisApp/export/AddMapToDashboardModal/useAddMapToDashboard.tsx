import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { Anchor } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError } from "@/utils/notifications/notify";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { MapPBlockDashboardConfigs } from "@/views/GisApp/export/AddMapToDashboardModal/MapPBlockDashboardConfigs/MapPBlockDashboardConfigs";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type {
  AvaPageData,
  AvaPageGenericData,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";

type Options = Readonly<{
  mapId: AvaMap.Id;
  workspaceSlug: string;
  onClose: () => void;
}>;

type AddMapToDashboardActions = {
  /** Appends a Map block for this map to `dashboard` and saves it. */
  addToDashboard: (dashboard: Dashboard.T) => void;

  /** Creates a dashboard named `dashboardName` that holds this map. */
  createDashboard: (dashboardName: string) => void;
  isAdding: boolean;
  isCreating: boolean;
};

type MapAddedToast = (
  options: Readonly<{ dashboardId: Dashboard.Id; title: string }>,
) => void;

/** Stores page data as a dashboard's JSON config, as the explorer does. */
function _pageDataToDashboardConfig(
  pageData: AvaPageData,
): Dashboard.T["config"] {
  return pageData as unknown as Dashboard.T["config"];
}

/** A success toast whose link opens the dashboard in its editor. */
function useMapAddedToast(workspaceSlug: string): MapAddedToast {
  const { t } = useLingui();
  const navigate = useNavigate();
  return (options) => {
    notifications.show({
      color: "green",
      title: options.title,
      message: (
        <Anchor
          size="sm"
          onClick={() => {
            void navigate({
              to: "/$workspaceSlug/dashboards/edit/$dashboardId",
              params: { workspaceSlug, dashboardId: options.dashboardId },
            });
          }}
        >
          {t`Open dashboard`}
        </Anchor>
      ),
    });
  };
}

/** The mutation that creates a dashboard, closing the modal on success. */
function useInsertMapDashboard(options: Options) {
  const { t } = useLingui();
  const showMapAddedToast = useMapAddedToast(options.workspaceSlug);
  return DashboardClient.useInsert({
    queriesToInvalidate: [DashboardClient.QueryKeys.getAll()],
    onSuccess: (dashboard) => {
      showMapAddedToast({
        dashboardId: dashboard.id,
        title: t`Created "${dashboard.name}" with this map`,
      });
      options.onClose();
    },
    onError: (error) => {
      notifyError(t`Could not create the dashboard: ${error.message}`);
    },
  });
}

/** The mutation that saves a dashboard, closing the modal on success. */
function useUpdateMapDashboard(options: Options) {
  const { t } = useLingui();
  const showMapAddedToast = useMapAddedToast(options.workspaceSlug);
  return DashboardClient.useUpdate({
    queriesToInvalidate: [DashboardClient.QueryKeys.getAll()],
    onSuccess: (dashboard) => {
      showMapAddedToast({
        dashboardId: dashboard.id,
        title: t`Added this map to "${dashboard.name}"`,
      });
      options.onClose();
    },
    onError: (error) => {
      notifyError(t`Could not add the map: ${error.message}`);
    },
  });
}

/**
 * Builds the `createDashboard` action: a new dashboard owned by the current
 * user, titled with its name and holding one Map block.
 */
function useCreateMapDashboard(
  options: Options,
): [createDashboard: (dashboardName: string) => void, isCreating: boolean] {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const [insertDashboard, isCreating] = useInsertMapDashboard(options);
  const createDashboard = (dashboardName: string): void => {
    if (!userProfile) {
      notifyError(t`Your user profile is not loaded yet. Please retry.`);
      return;
    }
    const now = new Date().toISOString();
    const pageData = MapPBlockDashboardConfigs.createPageData({
      dashboardName,
      mapId: options.mapId,
    });
    insertDashboard({
      data: Model.make("Dashboard", {
        workspaceId: workspace.id,
        ownerId: userProfile.userId,
        ownerProfileId: userProfile.profileId,
        name: dashboardName,
        description: undefined,
        slug: undefined,
        config: _pageDataToDashboardConfig(pageData),
        createdAt: now,
        updatedAt: now,
      }),
    });
  };
  return [createDashboard, isCreating];
}

/**
 * Adds a map to one of the user's dashboards, or creates a dashboard holding
 * it, then shows a toast that links to the dashboard editor.
 */
export function useAddMapToDashboard(
  options: Options,
): AddMapToDashboardActions {
  const [updateDashboard, isAdding] = useUpdateMapDashboard(options);
  const [createDashboard, isCreating] = useCreateMapDashboard(options);
  return {
    addToDashboard: (dashboard) => {
      const pageData = MapPBlockDashboardConfigs.appendToPageData({
        pageData: upgradeAvaPageData(
          dashboard.config as unknown as AvaPageGenericData,
        ),
        mapId: options.mapId,
      });
      updateDashboard({
        id: dashboard.id,
        data: { config: _pageDataToDashboardConfig(pageData) },
      });
    },
    createDashboard,
    isAdding,
    isCreating,
  };
}
