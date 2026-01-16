import { Puck } from "@puckeditor/core";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import type { DashboardRead } from "@/models/Dashboard/Dashboard.types";
import type { Config, Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notifySuccess } from "@/lib/ui/notifications/notify";

type Props = {
  readonly dashboard: DashboardRead | undefined;
};

type HeadingBlockProps = {
  children: string;
};

type DashboardRootProps = {
  title: string;
};

type DashboardPuckData = Data<{
  HeadingBlock: HeadingBlockProps;
}>;

const EMPTY_DATA: DashboardPuckData = {
  root: { props: {} },
  content: [],
};

function _isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function _getDashboardTitleFromPuckData(
  data: DashboardPuckData,
): string | undefined {
  if (!_isRecord(data.root.props)) {
    return undefined;
  }

  const title: unknown = (data.root.props as Partial<DashboardRootProps>).title;

  return typeof title === "string" && title.trim().length > 0 ?
      title
    : undefined;
}

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

function _getInitialPuckData(options: {
  dashboard: DashboardRead;
}): DashboardPuckData {
  const config: unknown = options.dashboard.config;
  const dashboardTitle: string = options.dashboard.name;

  if (
    _isRecord(config) &&
    _isRecord(config.root) &&
    _isRecord(config.root.props) &&
    Array.isArray(config.content)
  ) {
    const dataFromBackend: DashboardPuckData = config as DashboardPuckData;

    return _getDashboardTitleFromPuckData(dataFromBackend) ? dataFromBackend : (
        _withDashboardTitle({
          data: dataFromBackend,
          title: dashboardTitle,
        })
      );
  }

  return _withDashboardTitle({
    data: EMPTY_DATA,
    title: dashboardTitle,
  });
}

function _getPuckConfig(options: { dashboardTitle: string }): Config<{
  HeadingBlock: HeadingBlockProps;
}> {
  return {
    root: {
      fields: {
        title: {
          type: "text",
        },
      },
      defaultProps: {
        title: options.dashboardTitle,
      },
    },
    components: {
      HeadingBlock: {
        fields: {
          children: {
            type: "text",
          },
        },
        render: ({ children }: HeadingBlockProps) => {
          return <h1>{children}</h1>;
        },
      },
    },
  };
}

export function DashboardEditorView({ dashboard }: Props): JSX.Element {
  const dashboardTitle: string = dashboard?.name ?? "Untitled dashboard";
  const [data, setData] = useState<DashboardPuckData>(() => {
    return _withDashboardTitle({
      data: EMPTY_DATA,
      title: dashboardTitle,
    });
  });

  const lastDashboardIdRef = useRef<DashboardRead["id"] | undefined>(undefined);

  useEffect(() => {
    if (!dashboard) {
      return;
    }

    if (lastDashboardIdRef.current === dashboard.id) {
      return;
    }

    lastDashboardIdRef.current = dashboard.id;
    setData(_getInitialPuckData({ dashboard }));
  }, [dashboard]);

  const puckConfig = useMemo(() => {
    return _getPuckConfig({ dashboardTitle });
  }, [dashboardTitle]);

  const [saveDashboard] = DashboardClient.useUpdate({
    onSuccess: () => {
      notifySuccess("Dashboard saved successfully!");
    },
  });

  const onPublish = useCallback(
    (publishedData: DashboardPuckData): void => {
      if (!dashboard) {
        notifyDevAlert("Dashboard is not loaded yet.");
        return;
      }

      const publishedTitle: string =
        _getDashboardTitleFromPuckData(publishedData) ?? dashboardTitle;

      const publishedConfig: DashboardRead["config"] =
        publishedData as unknown as DashboardRead["config"];

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
      config={puckConfig}
      data={data}
      onChange={setData}
      onPublish={onPublish}
    />
  );
}
