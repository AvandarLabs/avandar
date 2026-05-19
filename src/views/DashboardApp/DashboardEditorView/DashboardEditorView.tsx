import { Data, Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { Alert, Flex, Text } from "@mantine/core";
import { Link, notifyDevAlert, notifySuccess } from "@ui";
import { createInitialDashboardPuckData } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { ShareResourceButton } from "@/components/permissions/ShareResourceModal/ShareResourceButton/ShareResourceButton";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import { DeleteDashboardButton } from "@/views/DashboardApp/DashboardEditorView/DeleteDashboardButton";
import {
  getDashboardPuckConfig,
  getDashboardTitleFromPuckData,
} from "@/views/DashboardApp/DashboardEditorView/getDashboardPuckConfig";
import { PublishDashboardButton } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardButton";
import { SaveDashboardButton } from "@/views/DashboardApp/DashboardEditorView/SaveDashboardButton";
import { ViewDashboardButton } from "@/views/DashboardApp/DashboardEditorView/ViewDashboardButton";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

type Props = {
  dashboard: Dashboard.T;
  workspaceSlug: string;
};
export function DashboardEditorView({
  dashboard,
  workspaceSlug,
}: Props): JSX.Element {
  const [appRoles] = useUserAppRoles();
  const dashboardEditorDispatch = DashboardEditorStateManager.useDispatch();
  const { pendingBlocks } = DashboardEditorStateManager.useState();

  // Register / unregister this dashboard as the active editor target. The
  // chat panel reads this to decide whether to offer the `addDashboardBlock`
  // tool to the model.
  useEffect(() => {
    dashboardEditorDispatch.setActiveDashboard(dashboard.id);
    return () => {
      dashboardEditorDispatch.setActiveDashboard(undefined);
    };
  }, [dashboard.id, dashboardEditorDispatch]);
  // True when the user has no dashboards app role; in that case the
  // dashboard is visible only through a resource share. The banner is
  // informational and never blocks rendering.
  const isShareOnlyAccess = !!appRoles && !appRoles.dashboards;

  const [data, setData] = useState<AvaPageData>(() => {
    return createInitialDashboardPuckData({
      dashboardTitle: dashboard.name ?? "Untitled dashboard",
    });
  });
  const dashboardTitle: string = dashboard.name ?? "Untitled dashboard";

  const lastDashboardIdRef = useRef<Dashboard.Id | undefined>(undefined);

  // simple counter to force Puck to re-mount when the initial data changes
  const [editorKey, setEditorKey] = useState(0);

  // Tracks whether the in-memory Puck data has diverged from what is
  // persisted in the dashboard's `config`. Publishing copies the persisted
  // config to the public bucket, so we disable publish while dirty.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (lastDashboardIdRef.current === dashboard.id) {
      return;
    }

    lastDashboardIdRef.current = dashboard.id;
    const dashboardConfigData = dashboard.config as AvaPageData;
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
    setData(upgradeAvaPageData(puckData));
    setHasUnsavedChanges(false);
    setEditorKey((prevEditorKey) => {
      return prevEditorKey + 1;
    });
  }, [dashboard, dashboardTitle]);

  const puckConfig = useMemo(() => {
    return getDashboardPuckConfig({
      dashboardTitle,
      workspaceId: dashboard.workspaceId,
      dashboardId: dashboard.id,
    });
  }, [dashboard.id, dashboard.workspaceId, dashboardTitle]);

  // Drain blocks queued by the chat panel into the dashboard's Puck data.
  // Marks the editor dirty so the Save button can be activated.
  useEffect(() => {
    if (pendingBlocks.length === 0) {
      return;
    }
    setData((prev) => {
      const newContent = [
        ...prev.content,
        ...pendingBlocks.map((p) => {
          return p.block;
        }),
      ];
      return { ...prev, content: newContent };
    });
    setHasUnsavedChanges(true);
    dashboardEditorDispatch.consumePendingBlocks();
  }, [pendingBlocks, dashboardEditorDispatch]);

  const [saveDashboard] = DashboardClient.useUpdate({
    queriesToInvalidate:
      dashboard ?
        [
          DashboardClient.QueryKeys.getAll(),
          DashboardClient.QueryKeys.getById({ id: dashboard.id }),
        ]
      : undefined,
    onSuccess: () => {
      notifySuccess("Dashboard saved successfully!");
      setHasUnsavedChanges(false);
    },
  });

  const onSave = useCallback(
    (savedData: AvaPageData): void => {
      if (!dashboard) {
        notifyDevAlert("Dashboard is not loaded yet.");
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
      <Flex direction="column" h="100%">
        {isShareOnlyAccess ?
          <Alert color="blue" variant="light" title="Shared with you" m="sm">
            <Text size="sm">
              You can view this dashboard because it was shared with you.
              {isFlagEnabled(FeatureFlag.EnableSharedWithMe) ?
                <>
                  {" "}
                  <Link
                    to="/$workspaceSlug/shared-with-me"
                    params={{ workspaceSlug }}
                  >
                    See all shared items
                  </Link>
                </>
              : null}
            </Text>
          </Alert>
        : null}
        <Puck
          key={editorKey}
          metadata={avaPageMetadata}
          config={puckConfig}
          height="100%"
          data={data}
          onChange={(d: Data) => {
            setData(d as AvaPageData);
            setHasUnsavedChanges(true);
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
