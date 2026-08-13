import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Flex, Text } from "@mantine/core";
import { Data, Puck } from "@puckeditor/core";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { ShareResourceButton } from "@/components/permissions/ShareResourceModal/ShareResourceButton/ShareResourceButton";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DeleteDashboardButton } from "@/views/DashboardApp/DashboardEditorView/DeleteDashboardButton";
import { ExportPdfButton } from "@/views/DashboardApp/DashboardEditorView/ExportPdfButton";
import { PublishDashboardButton } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardButton";
import { SaveDashboardButton } from "@/views/DashboardApp/DashboardEditorView/SaveDashboardButton/SaveDashboardButton";
import {
  getDashboardTitleFromPuckData,
  useDashboardPuckConfig,
} from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";
import { ViewDashboardButton } from "@/views/DashboardApp/DashboardEditorView/ViewDashboardButton";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
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
export function DashboardEditorView({
  dashboard,
  workspaceSlug,
}: Props): ReactElement {
  const { t, i18n } = useLingui();
  const [appRoles] = useUserAppRoles();
  const dashboardEditorDispatch = DashboardEditorStateManager.useDispatch();
  const { editorData, editorRevision, hasUnsavedChanges } =
    DashboardEditorStateManager.useState();

  const initialEditorData = useMemo(() => {
    const dashboardConfigData = dashboard.config as AvaPageData;
    return upgradeAvaPageData({
      ...dashboardConfigData,
      root: {
        ...dashboardConfigData.root,
        props: {
          ...dashboardConfigData.root.props,
          title: dashboard.name || "Untitled dashboard",
          schemaVersion: getVersionFromAvaPageData(dashboardConfigData),
        },
      },
    });
  }, [dashboard.config, dashboard.name]);

  // Register / unregister this dashboard as the active editor target. The
  // chat panel reads this to decide whether to offer the `addDashboardBlock`
  // tool to the model.
  useEffect(
    function registerActiveDashboard() {
      dashboardEditorDispatch.setActiveDashboard({
        dashboardId: dashboard.id,
        editorData: initialEditorData,
      });
      return () => {
        dashboardEditorDispatch.setActiveDashboard(undefined);
      };
    },
    [dashboard.id, dashboardEditorDispatch, initialEditorData],
  );
  // True when the user has no dashboards app role; in that case the
  // dashboard is visible only through a resource share. The banner is
  // informational and never blocks rendering.
  const isShareOnlyAccess = !!appRoles && !appRoles.dashboards;

  const dashboardTitle: string = dashboard.name ?? "Untitled dashboard";

  const puckConfig = useDashboardPuckConfig({
    dashboardTitle,
    workspaceId: dashboard.workspaceId,
    dashboardId: dashboard.id,
    i18n,
  });

  const [saveDashboard] = DashboardClient.useUpdate({
    queriesToInvalidate:
      dashboard ?
        [
          DashboardClient.QueryKeys.getAll(),
          DashboardClient.QueryKeys.getById({ id: dashboard.id }),
        ]
      : undefined,
    onSuccess: () => {
      notifySuccess(t`Dashboard saved successfully!`);
      dashboardEditorDispatch.markSaved();
    },
  });

  const onSave = useCallback(
    (savedData: AvaPageData): void => {
      if (!dashboard) {
        notifyError({ message: "Dashboard is not loaded yet." });
        return;
      }

      const publishedTitle: string =
        getDashboardTitleFromPuckData(savedData) ?? dashboardTitle;
      const publishedConfig: Dashboard.T["config"] =
        savedData as unknown as Dashboard.T["config"];

      saveDashboard({
        id: dashboard.id,
        data: {
          name: publishedTitle,
          config: publishedConfig,
        },
      });
    },
    [dashboard, dashboardTitle, saveDashboard],
  );

  const avaPageMetadata = useMemo(() => {
    return getAvaPageMetadataFromDashboard(dashboard);
  }, [dashboard]);

  return (
    <DashboardFilterStateManager.Provider>
      <AppLayout floatingToolbar>
        <Flex direction="column" h="100%" pt={40}>
          {isShareOnlyAccess ?
            <Alert
              color="blue"
              variant="light"
              title={t`Shared with you`}
              m="sm"
            >
              <Text size="sm">
                <Trans>
                  You can view this dashboard because it was shared with you.
                </Trans>
              </Text>
            </Alert>
          : null}
          <Puck
            key={editorRevision}
            metadata={avaPageMetadata}
            config={puckConfig}
            height="100%"
            data={editorData ?? initialEditorData}
            onChange={(d: Data) => {
              dashboardEditorDispatch.updateEditorData(d as AvaPageData);
            }}
            overrides={{
              headerActions: () => {
                return (
                  <>
                    <SaveDashboardButton onSave={onSave} />
                    <ShareResourceButton
                      resourceName={dashboardTitle}
                      resourceType="dashboard"
                      resourceId={dashboard.id}
                      size={DASHBOARD_TOOLBAR_BUTTON_SIZE}
                    />
                    <ViewDashboardButton
                      workspaceSlug={workspaceSlug}
                      dashboardId={dashboard.id}
                      hasUnsavedChanges={hasUnsavedChanges}
                    />
                    <PublishDashboardButton
                      dashboard={dashboard}
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
              },
            }}
          />
        </Flex>
      </AppLayout>
    </DashboardFilterStateManager.Provider>
  );
}
