import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { notifySuccess } from "@/lib/ui/notifications/notify";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { DeleteDashboardButton } from "./DeleteDashboardButton";
import {
  getDashboardPuckConfig,
  getDashboardTitleFromPuckData,
  getInitialDashboardPuckData,
} from "./getDashboardPuckConfig";
import { PublishDashboardButton } from "./PublishDashboardButton";
import { SaveDashboardButton } from "./SaveDashboardButton";
import { ViewDashboardButton } from "./ViewDashboardButton";
import type { DashboardPuckData } from "./DashboardPuck.types";
import type { DashboardRead } from "@/models/Dashboard/Dashboard.types";

type Props = {
  readonly dashboard: DashboardRead | undefined;
  readonly workspaceSlug: string;
};

const EMPTY_DATA: DashboardPuckData = {
  root: { props: {} },
  content: [],
};

function _withDashboardTitle(options: {
  data: DashboardPuckData;
  title: string;
}): DashboardPuckData {
  return {
    ...options.data,
    root: {
      ...options.data.root,
      props: {
        ...(options.data.root.props ?? {}),
        title: options.title,
      },
    },
  };
}

export function DashboardEditorView({
  dashboard,
  workspaceSlug,
}: Props): JSX.Element {
  const dashboardTitle: string = dashboard?.name ?? "Untitled dashboard";
  const [data, setData] = useState<DashboardPuckData>(() => {
    return _withDashboardTitle({
      data: EMPTY_DATA,
      title: dashboardTitle,
    });
  });

  const lastDashboardIdRef = useRef<DashboardRead["id"] | undefined>(undefined);

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
    setData(getInitialDashboardPuckData({ dashboard }));
    setEditorKey((prevEditorKey) => {
      return prevEditorKey + 1;
    });
  }, [dashboard]);

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
    (savedData: DashboardPuckData): void => {
      if (!dashboard) {
        notifyDevAlert("Dashboard is not loaded yet.");
        return;
      }

      const publishedTitle: string =
        getDashboardTitleFromPuckData(savedData) ?? dashboardTitle;

      const publishedConfig: DashboardRead["config"] =
        savedData as unknown as DashboardRead["config"];

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
    <Puck
      key={editorKey}
      config={puckConfig}
      data={data}
      onChange={setData}
      overrides={{
        headerActions: () => {
          return (
            <>
              <SaveDashboardButton onSave={onSave} />
              <ViewDashboardButton
                workspaceSlug={workspaceSlug}
                dashboardId={dashboard?.id}
              />
              <PublishDashboardButton
                dashboardId={dashboard?.id}
                isPublic={dashboard?.isPublic}
              />
              <DeleteDashboardButton
                workspaceSlug={workspaceSlug}
                dashboardId={dashboard?.id}
              />
            </>
          );
        },
      }}
    />
  );
}
