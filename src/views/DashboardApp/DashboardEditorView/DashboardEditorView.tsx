import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Flex, Text } from "@mantine/core";
import { Data, Puck } from "@puckeditor/core";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { notifySuccess } from "@/utils/notifications/notify";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DeleteDashboardButton } from "@/views/DashboardApp/DashboardEditorView/DeleteDashboardButton";
import { ExportPdfButton } from "@/views/DashboardApp/DashboardEditorView/ExportPdfButton";
import { SaveDashboardButton } from "@/views/DashboardApp/DashboardEditorView/SaveDashboardButton/SaveDashboardButton";
import {
  getDashboardTitleFromPuckData,
  useDashboardPuckConfig,
} from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";
import { ViewDashboardButton } from "@/views/DashboardApp/DashboardEditorView/ViewDashboardButton";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import { DashboardShareButton } from "@/views/DashboardApp/DashboardShareModal/DashboardShareButton";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import "@puckeditor/core/puck.css";
import { useCallback, useEffect, useMemo } from "react";
import { DASHBOARD_TOOLBAR_BUTTON_SIZE } from "./DashboardEditorView.constants";
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
  useEffect(
    function registerActiveDashboard() {
      dispatch.setActiveDashboard({
        dashboardId,
        editorData: initialEditorData,
      });
      return () => {
        return dispatch.setActiveDashboard(undefined);
      };
    },
    [dashboardId, dispatch, initialEditorData],
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

type DashboardEditorViewState = {
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

type RenderDashboardEditorToolbarOptions = {
  dashboard: Dashboard.T;
  workspaceSlug: string;
  hasUnsavedChanges: boolean;
  onSave: (data: AvaPageData) => void;
};

function _renderDashboardEditorToolbar(
  options: Readonly<RenderDashboardEditorToolbarOptions>,
): ReactElement {
  const { dashboard, workspaceSlug, hasUnsavedChanges } = options;
  return (
    <>
      <SaveDashboardButton onSave={options.onSave} />
      <DashboardShareButton
        dashboard={dashboard}
        hasUnsavedChanges={hasUnsavedChanges}
        size={DASHBOARD_TOOLBAR_BUTTON_SIZE}
      />
      <ViewDashboardButton
        workspaceSlug={workspaceSlug}
        dashboardId={dashboard.id}
        hasUnsavedChanges={hasUnsavedChanges}
      />
      <ExportPdfButton
        dashboard={dashboard}
        hasUnsavedChanges={hasUnsavedChanges}
      />
      <DeleteDashboardButton
        workspaceSlug={workspaceSlug}
        dashboardId={dashboard.id}
      />
    </>
  );
}

function _renderShareOnlyAccessAlert(): ReactElement {
  return (
    <Alert
      color="blue"
      variant="light"
      title={<Trans>Shared with you</Trans>}
      m="sm"
    >
      <Text size="sm">
        <Trans>
          You can view this dashboard because it was shared with you.
        </Trans>
      </Text>
    </Alert>
  );
}

function _renderDashboardEditorContent(
  options: Readonly<{
    dashboard: Dashboard.T;
    state: DashboardEditorViewState;
    workspaceSlug: string;
  }>,
): ReactElement {
  const { dashboard, state, workspaceSlug } = options;
  return (
    <DashboardFilterStateManager.Provider>
      <AppLayout floatingToolbar>
        <Flex direction="column" h="100%" pt={40}>
          {state.isShareOnlyAccess ? _renderShareOnlyAccessAlert() : null}
          <Puck
            key={state.editorRevision}
            metadata={state.metadata}
            config={state.puckConfig}
            height="100%"
            data={state.editorData ?? state.initialEditorData}
            onChange={(data: Data) => {
              state.dispatch.updateEditorData(data as AvaPageData);
            }}
            overrides={{
              headerActions: () => {
                return _renderDashboardEditorToolbar({
                  dashboard,
                  workspaceSlug,
                  hasUnsavedChanges: state.hasUnsavedChanges,
                  onSave: state.onSave,
                });
              },
            }}
          />
        </Flex>
      </AppLayout>
    </DashboardFilterStateManager.Provider>
  );
}

/** Renders the dashboard editor and its persistence toolbar. */
export function DashboardEditorView({
  dashboard,
  workspaceSlug,
}: Readonly<Props>): ReactElement {
  const state = useDashboardEditorViewState(dashboard);
  return _renderDashboardEditorContent({ dashboard, state, workspaceSlug });
}
