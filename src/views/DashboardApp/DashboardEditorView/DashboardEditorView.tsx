import { Data, Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { Flex } from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { AppLayout } from "@/components/common/layouts/AppLayout";
import { notifySuccess } from "@/lib/ui/notifications/notify";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { DeleteDashboardButton } from "./DeleteDashboardButton";
import {
  createInitialDashboardPuckData,
  getDashboardPuckConfig,
  getDashboardTitleFromPuckData,
} from "./getDashboardPuckConfig";
import { getVersionFromAvaPageData } from "./migrations/getVersionFromAvaPageData";
import { PublishDashboardButton } from "./PublishDashboardButton";
import { SaveDashboardButton } from "./SaveDashboardButton";
import { upgradeAvaPageData } from "./utils/upgradeAvaPageData";
import { ViewDashboardButton } from "./ViewDashboardButton";
import type { AvaPageData } from "./AvaPage.types";
import type {
  Dashboard,
  DashboardId,
} from "@/models/Dashboard/Dashboard.types";

type Props = {
  dashboard: Dashboard | undefined;
  workspaceSlug: string;
};
export function DashboardEditorView({
  dashboard,
  workspaceSlug,
}: Props): JSX.Element {
  const [data, setData] = useState<AvaPageData>(() => {
    return createInitialDashboardPuckData({
      dashboardTitle: dashboard?.name ?? "Untitled dashboard",
    });
  });
  const dashboardTitle: string = dashboard?.name ?? "Untitled dashboard";

  const lastDashboardIdRef = useRef<DashboardId | undefined>(undefined);

  // simple counter to force Puck to re-mount when the initial data changes
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (!dashboard) {
      return;
    }

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
      workspaceId: dashboard?.workspaceId,
    });
  }, [dashboard?.workspaceId, dashboardTitle]);

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
      const publishedConfig: Dashboard["config"] =
        savedData as unknown as Dashboard["config"];

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

  return (
    <AppLayout floatingToolbar>
      <Flex direction="column" h="100%">
        <Puck
          key={editorKey}
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
                    dashboardId={dashboard?.id}
                  />
                  <PublishDashboardButton dashboardId={dashboard?.id} />
                  <DeleteDashboardButton
                    workspaceSlug={workspaceSlug}
                    dashboardId={dashboard?.id}
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
