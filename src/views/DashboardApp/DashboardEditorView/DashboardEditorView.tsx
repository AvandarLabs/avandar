import { Data, Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { Flex } from "@mantine/core";
import { notifySuccess } from "@ui/notifications/notify";
import { notifyDevAlert } from "@ui/notifications/notifyDevAlert";
import { createInitialDashboardPuckData } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { AppLayout } from "@/components/common/layouts/AppLayout/AppLayout";
import { getVersionFromAvaPageData } from "@/views/DashboardApp/AvaPage/migrations/getVersionFromAvaPageData";
import { getAvaPageMetadataFromDashboard } from "@/views/DashboardApp/AvaPage/utils/getAvaPageMetadataFromDashboard";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
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
  const [data, setData] = useState<AvaPageData>(() => {
    return createInitialDashboardPuckData({
      dashboardTitle: dashboard.name ?? "Untitled dashboard",
    });
  });
  const dashboardTitle: string = dashboard.name ?? "Untitled dashboard";

  const lastDashboardIdRef = useRef<Dashboard.Id | undefined>(undefined);

  // simple counter to force Puck to re-mount when the initial data changes
  const [editorKey, setEditorKey] = useState(0);

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
    setEditorKey((prevEditorKey) => {
      return prevEditorKey + 1;
    });
  }, [dashboard, dashboardTitle]);

  const puckConfig = useMemo(() => {
    return getDashboardPuckConfig({
      dashboardTitle,
      workspaceId: dashboard.workspaceId,
    });
  }, [dashboard.workspaceId, dashboardTitle]);

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
    <AppLayout floatingToolbar>
      <Flex direction="column" h="100%">
        <Puck
          key={editorKey}
          metadata={avaPageMetadata}
          config={puckConfig}
          height="100%"
          data={data}
          onChange={(d: Data) => {
            setData(d as AvaPageData);
          }}
          overrides={{
            headerActions: () => {
              return (
                <>
                  <SaveDashboardButton onSave={onSave} />
                  <ViewDashboardButton
                    workspaceSlug={workspaceSlug}
                    dashboardId={dashboard.id}
                  />
                  <PublishDashboardButton dashboardId={dashboard.id} />
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
  );
}
