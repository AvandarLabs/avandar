import { useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { notifySuccess } from "@/utils/notifications/notify";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DashboardEditorContent } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorContent";
import {
  getDashboardTitleFromPuckData,
  useDashboardPuckConfig,
} from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import "@puckeditor/core/puck.css";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ReactElement } from "react";

type Props = {
  dashboard: Dashboard.T;
  workspaceSlug: string;
};

function _getInitialEditorData(
  options: Readonly<{ dashboard: Dashboard.T; untitledDashboard: string }>,
): AvaPageData {
  const dashboardConfigData = options.dashboard.config as AvaPageData;
  return upgradeAvaPageData({
    ...dashboardConfigData,
    root: {
      ...dashboardConfigData.root,
      props: {
        ...dashboardConfigData.root.props,
        title: options.dashboard.name || options.untitledDashboard,
        schemaVersion: getVersionFromAvaPageData(dashboardConfigData),
      },
    },
  });
}

function useRegisterActiveDashboard(
  options: Readonly<{
    dashboardId: Dashboard.Id;
    initialEditorData: AvaPageData;
    dispatch: ReturnType<typeof DashboardEditorStateManager.useDispatch>;
  }>,
): void {
  const { dashboardId, initialEditorData, dispatch } = options;
  const initialEditorDataRef = useRef(initialEditorData);
  useEffect(
    function trackInitialEditorData() {
      initialEditorDataRef.current = initialEditorData;
    },
    [initialEditorData],
  );
  useEffect(
    function registerActiveDashboard() {
      // Seed from a ref so a loader refetch with a new dashboard object does
      // not remount Puck. Unsaved edits live in editorData; bumping
      // editorRevision would reload the canvas table.
      dispatch.setActiveDashboard({
        dashboardId,
        editorData: initialEditorDataRef.current,
      });
      return () => {
        return dispatch.setActiveDashboard(undefined);
      };
    },
    [dashboardId, dispatch],
  );
}

type SaveDashboardOptions = {
  dashboard: Dashboard.T;
  dashboardTitle: string;
  savedMessage: string;
  dispatch: ReturnType<typeof DashboardEditorStateManager.useDispatch>;
};

function useSaveDashboard(
  options: Readonly<SaveDashboardOptions>,
): (savedData: AvaPageData) => void {
  const [saveDashboard] = DashboardClient.useUpdate({
    queriesToInvalidate: [
      DashboardClient.QueryKeys.getAll(),
      DashboardClient.QueryKeys.getById({ id: options.dashboard.id }),
    ],
    onSuccess: () => {
      notifySuccess(options.savedMessage);
      options.dispatch.markSaved();
    },
  });
  // Depends on the primitives, not on `options`: the caller builds that object
  // inline, so a new identity arrives on every render and the callback would
  // memoize nothing.
  const dashboardId = options.dashboard.id;
  const { dashboardTitle } = options;
  return useCallback(
    (savedData: AvaPageData): void => {
      saveDashboard({
        id: dashboardId,
        data: {
          name: getDashboardTitleFromPuckData(savedData) ?? dashboardTitle,
          config: savedData as Dashboard.T["config"],
        },
      });
    },
    [dashboardId, dashboardTitle, saveDashboard],
  );
}

export type DashboardEditorViewState = {
  dashboardTitle: string;
  editorData: AvaPageData | undefined;
  editorRevision: number;
  hasUnsavedChanges: boolean;
  initialEditorData: AvaPageData;
  isShareOnlyAccess: boolean;
  metadata: ReturnType<typeof getAvaPageMetadataFromDashboard>;
  onSave: (savedData: AvaPageData) => void;
  puckConfig: ReturnType<typeof useDashboardPuckConfig>;
  dispatch: ReturnType<typeof DashboardEditorStateManager.useDispatch>;
};

function useInitialEditorData(
  options: Readonly<{
    dashboard: Dashboard.T;
    dashboardTitle: string;
  }>,
): AvaPageData {
  return useMemo(() => {
    return _getInitialEditorData({
      dashboard: options.dashboard,
      untitledDashboard: options.dashboardTitle,
    });
  }, [options.dashboard, options.dashboardTitle]);
}

function useDashboardEditorMetadata(
  dashboard: Readonly<Dashboard.T>,
): ReturnType<typeof getAvaPageMetadataFromDashboard> {
  return useMemo(() => {
    return getAvaPageMetadataFromDashboard({ dashboard, surface: "editor" });
  }, [dashboard]);
}

function useDashboardEditorViewState(
  dashboard: Readonly<Dashboard.T>,
): DashboardEditorViewState {
  const { t, i18n } = useLingui();
  const [appRoles] = useUserAppRoles();
  const dispatch = DashboardEditorStateManager.useDispatch();
  const { editorData, editorRevision, hasUnsavedChanges } =
    DashboardEditorStateManager.useState();
  const dashboardTitle = dashboard.name ?? t`Untitled dashboard`;
  const initialEditorData = useInitialEditorData({
    dashboard,
    dashboardTitle,
  });
  useRegisterActiveDashboard({
    dashboardId: dashboard.id,
    initialEditorData,
    dispatch,
  });
  const puckConfig = useDashboardPuckConfig({
    dashboardTitle,
    workspaceId: dashboard.workspaceId,
    dashboardId: dashboard.id,
    i18n,
  });
  const onSave = useSaveDashboard({
    dashboard,
    dashboardTitle,
    savedMessage: t`Dashboard saved successfully!`,
    dispatch,
  });
  const metadata = useDashboardEditorMetadata(dashboard);
  return {
    dashboardTitle,
    editorData,
    editorRevision,
    hasUnsavedChanges,
    initialEditorData,
    isShareOnlyAccess: !!appRoles && !appRoles.dashboards,
    metadata,
    onSave,
    puckConfig,
    dispatch,
  };
}

/** Renders the dashboard editor and its persistence toolbar. */
export function DashboardEditorView({
  dashboard,
  workspaceSlug,
}: Readonly<Props>): ReactElement {
  const state = useDashboardEditorViewState(dashboard);
  return (
    <DashboardEditorContent
      dashboard={dashboard}
      state={state}
      workspaceSlug={workspaceSlug}
    />
  );
}
