import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react";
import { Render } from "@puckeditor/core";
import { memo } from "react";
import { useDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";
import { DashboardPreviewBanner } from "@/views/DashboardApp/DashboardViewerView/DashboardPreviewBanner/DashboardPreviewBanner";
import {
  chartConfig,
  chartColumns,
  DASHBOARD_NAME,
  DASHBOARD_SQL,
} from "../shims/import-dashboard/DashboardFixtureContext";
import { Editor } from "./Editor/Editor";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ReactNode } from "react";

type Props = { isPreview: boolean; height: number };
const dashboard = Model.make("Dashboard", {
  id: "film-harborfield-dashboard",
  workspaceId: "film-workspace",
  name: DASHBOARD_NAME,
  description: undefined,
  visibility: "draft",
  createdAt: "2026-10-14T21:53:32Z",
  updatedAt: "2026-10-14T21:53:32Z",
}) as Dashboard.T;
const data: AvaPageData = {
  root: {
    props: {
      title: DASHBOARD_NAME,
      schemaVersion: 5,
      theme: "default",
      typography: "system",
      containerMaxWidth: { unit: "%", value: 100 },
      horizontalPadding: "md",
      verticalPadding: "lg",
      subtitle: "",
      author: "",
      publishedAt: "",
      isTitleHidden: false,
      isSubtitleHidden: false,
      isAuthorHidden: false,
      isPublishedAtHidden: false,
    },
  },
  content: [
    {
      type: "DataViz",
      props: {
        id: "film-district-chart",
        columnBindingVersion: 1,
        columnBindings: {
          version: 1,
          scopeKey: "film-district-chart",
          sqlKey: DASHBOARD_SQL,
          columns: chartColumns,
        },
        globalFilterTargets: {},
        nlQuery: {
          prompt: "Saved from Data Explorer",
          rawSql: DASHBOARD_SQL,
          generations: [],
        },
        vizType: "bar",
        vizConfig: chartConfig,
        globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
        localFilters: [],
      },
    },
  ],
};
/**
 * Keep the product Puck config outside frame updates. Its render functions are
 * component identities. Recreating them remounts the responsive charts.
 * FixtureDataViz still receives every frame directly through context.
 */
export const DashboardCanvas = memo(function DashboardCanvas({
  isPreview,
  height,
}: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const config = useDashboardPuckConfig({
    dashboardTitle: DASHBOARD_NAME,
    workspaceId: dashboard.workspaceId,
    dashboardId: dashboard.id,
    i18n,
  });
  return isPreview ? (
    <>
      <DashboardPreviewBanner
        dashboard={dashboard}
        workspaceSlug="avandar-labs"
        canEdit
      />
      <Render config={config} data={data} />
    </>
  ) : (
    <Editor
      config={config}
      data={data}
      dashboardId={dashboard.id}
      height={height}
    />
  );
});
