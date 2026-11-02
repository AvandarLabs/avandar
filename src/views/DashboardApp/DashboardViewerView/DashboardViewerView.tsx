import { useLingui } from "@lingui/react/macro";
import { useEffect, useMemo } from "react";
import { notifyError } from "@/utils/notifications/notify";
import "@puckeditor/core/puck.css";
import { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { useDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";
import { DashboardViewerContent } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerContent";
import { useEnsurePublishedDashboardDatasets } from "@/views/DashboardApp/DashboardViewerView/useEnsurePublishedDashboardDatasets/useEnsurePublishedDashboardDatasets";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T;
  /**
   * "published" (default): a viewer route whose loader owns the access
   * decision. The view only asserts that the dashboard is published.
   * "preview": an authenticated preview that renders drafts from live data
   * and published dashboards from their snapshots.
   */
  mode?: "published" | "preview";
  workspaceSlug?: string;
  /** Whether the current viewer can navigate back to the dashboard editor. */
  canEdit?: boolean;
};

function _getDashboardViewerData(
  options: Readonly<{ dashboard: Dashboard.T; untitledDashboard: string }>,
): ReturnType<typeof upgradeAvaPageData> {
  const dashboardConfigData = options.dashboard.config as AvaPageGenericData;
  const puckData = {
    ...dashboardConfigData,
    root: {
      ...dashboardConfigData.root,
      props: {
        ...dashboardConfigData.root.props,
        title: options.dashboard.name || options.untitledDashboard,
        schemaVersion: getVersionFromAvaPageData(dashboardConfigData),
      },
    },
  };
  return upgradeAvaPageData(puckData);
}

function useDatasetLoadFailureNotification(
  options: Readonly<{
    error: Error | undefined;
    title: string;
    message: string;
  }>,
): void {
  const { error, title, message } = options;
  useEffect(
    function notifyDatasetLoadFailure() {
      if (!error) {
        return;
      }
      console.error(error);
      notifyError({ title, message });
    },
    [error, title, message],
  );
}

type RenderDashboardViewerOptions = {
  dashboard: Dashboard.T;
  mode: "published" | "preview";
  workspaceSlug: string | undefined;
  canEdit: boolean;
  isLoadingDatasets: boolean;
  loadingDatasetsError: Error | undefined;
  config: ReturnType<typeof useDashboardPuckConfig>;
  data: ReturnType<typeof upgradeAvaPageData>;
  metadata: ReturnType<typeof getAvaPageMetadataFromDashboard> | undefined;
};

function useDashboardViewerMetadata(
  options: Readonly<{
    dashboard: Dashboard.T;
    isMissingCommittedSnapshot: boolean;
    mode: "published" | "preview";
  }>,
): ReturnType<typeof getAvaPageMetadataFromDashboard> | undefined {
  return useMemo(() => {
    if (options.isMissingCommittedSnapshot) {
      return undefined;
    }
    return getAvaPageMetadataFromDashboard({
      dashboard: options.dashboard,
      surface: options.mode === "preview" ? "preview" : "published",
    });
  }, [options.dashboard, options.isMissingCommittedSnapshot, options.mode]);
}

type DashboardViewerState = Pick<
  RenderDashboardViewerOptions,
  "config" | "data" | "isLoadingDatasets" | "loadingDatasetsError" | "metadata"
>;

function useDashboardViewerState(
  options: Readonly<{
    dashboard: Dashboard.T;
    mode: "published" | "preview";
  }>,
): DashboardViewerState {
  const { dashboard, mode } = options;
  const { t, i18n } = useLingui();
  const { isLoadingDatasets, error: loadingDatasetsError } =
    useEnsurePublishedDashboardDatasets(dashboard);
  const config = useDashboardPuckConfig({
    dashboardTitle: dashboard.name || t`Untitled dashboard`,
    workspaceId: dashboard.workspaceId,
    dashboardId: dashboard.id,
    i18n,
  });
  const untitledDashboard = t`Untitled dashboard`;
  const data = useMemo(() => {
    return _getDashboardViewerData({ dashboard, untitledDashboard });
  }, [dashboard, untitledDashboard]);
  useDatasetLoadFailureNotification({
    error: loadingDatasetsError,
    title: t`Unable to load dashboard datasets`,
    message: t`Please try again later.`,
  });
  const metadata = useDashboardViewerMetadata({
    dashboard,
    isMissingCommittedSnapshot:
      dashboard.visibility !== "draft" && !dashboard.snapshotRevision,
    mode,
  });
  return {
    config,
    data,
    isLoadingDatasets,
    loadingDatasetsError,
    metadata:
      mode === "published" && dashboard.visibility === "draft"
        ? undefined
        : metadata,
  };
}

/** Renders a published dashboard or authenticated publication preview. */
export function DashboardViewerView({
  dashboard,
  mode = "published",
  workspaceSlug,
  canEdit = false,
}: Readonly<Props>): ReactNode {
  const state = useDashboardViewerState({ dashboard, mode });
  return (
    <DashboardViewerContent
      dashboard={dashboard}
      mode={mode}
      workspaceSlug={workspaceSlug}
      canEdit={canEdit}
      {...state}
    />
  );
}
