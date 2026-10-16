import { useLingui } from "@lingui/react";
import { Render } from "@puckeditor/core";
import { useMemo } from "react";
import "@puckeditor/core/puck.css";
import { useDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";
import { DashboardPreviewBanner } from "@/views/DashboardApp/DashboardViewerView/DashboardPreviewBanner/DashboardPreviewBanner";
import { ramp } from "../../src/motion";
import {
  chartConfig,
  DashboardFixtureContext,
  DASHBOARD_NAME,
  DASHBOARD_SQL,
} from "../shims/import-dashboard/DashboardFixtureContext";
import { CreateModal } from "./CreateModal";
import css from "./DashboardScreen.module.css";
import { Editor } from "./Editor";
import { SourceChart } from "./SourceChart";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

export const DASHBOARD_DURATION = 720;
export const DASHBOARD_BEATS = [
  { frame: 48, target: "dashboard-save-menu", action: "click" },
  { frame: 92, target: "dashboard-save-option", action: "click" },
  { frame: 144, target: "dashboard-name", action: "click" },
  { frame: 300, target: "dashboard-create", action: "click" },
  { frame: 456, target: "dashboard-view", action: "click" },
] as const;

const dashboard = {
  __type: "Dashboard",
  id: "film-harborfield-dashboard",
  workspaceId: "film-workspace",
  name: DASHBOARD_NAME,
  description: undefined,
  visibility: "draft",
  createdAt: "2026-10-14T21:53:32Z",
  updatedAt: "2026-10-14T21:53:32Z",
} as unknown as Dashboard.T;

const data: AvaPageData = {
  root: {
    props: {
      title: DASHBOARD_NAME,
      schemaVersion: 4,
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
 * Actual Avandar Puck configuration, chart card, save form and preview banner.
 * Frame controls only the fixture state and deterministic presentation timing.
 */
export function DashboardScreen({
  frame,
  width,
  height,
}: {
  frame: number;
  width: number;
  height: number;
}) {
  const { i18n } = useLingui();
  const config = useDashboardPuckConfig({
    dashboardTitle: DASHBOARD_NAME,
    workspaceId: dashboard.workspaceId,
    dashboardId: dashboard.id,
    i18n,
  });
  const context = useMemo(() => ({ frame, chartAt: 328 }), [frame]);
  return (
    <DashboardFixtureContext.Provider value={context}>
      <div
        style={{
          width,
          height,
          position: "relative",
          overflow: "hidden",
          background: "var(--ava-surface-raised)",
        }}
      >
        {frame < 346 ? (
          <div className={css.phaseLayerBase}>
            <SourceChart frame={Math.min(frame, 327)} />
            {frame >= 101 ? <CreateModal frame={Math.min(frame, 327)} /> : null}
          </div>
        ) : null}
        {frame >= 328 && frame < 492 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              background: "var(--ava-surface-raised)",
              opacity: ramp(frame, 328, 18),
            }}
          >
            <Editor
              config={config}
              data={data}
              dashboardId={dashboard.id}
              height={height}
            />
          </div>
        ) : null}
        {frame >= 474 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              opacity: ramp(frame, 474, 18),
              background: "var(--ava-surface-raised)",
            }}
          >
            <DashboardPreviewBanner
              dashboard={dashboard}
              workspaceSlug="avandar-labs"
              canEdit
            />
            <Render config={config} data={data} />
          </div>
        ) : null}
      </div>
    </DashboardFixtureContext.Provider>
  );
}

export { DashboardScreen as Screen };
