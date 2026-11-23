import { Puck } from "@puckeditor/core";
import { useLayoutEffect, useRef } from "react";
import { DASHBOARD_EDITOR_INITIAL_PUCK_UI } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView.constants";
import editorCss from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView.module.css";
import { useFullWidthCanvasViewport } from "@/views/DashboardApp/DashboardEditorView/useFullWidthCanvasViewport/useFullWidthCanvasViewport";
import { EditorActions } from "./EditorActions/EditorActions";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { useDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";
import type { ReactNode } from "react";

type Props = {
  config: ReturnType<typeof useDashboardPuckConfig>;
  data: AvaPageData;
  dashboardId: Dashboard.Id;
  height: number;
};

/**
 * The compact Puck editor surface, with the product's exact
 * save/share/view/delete header actions.
 */
export function Editor({
  config,
  data,
  dashboardId,
  height,
}: Readonly<Props>): ReactNode {
  const { onAction, PuckOverride } = useFullWidthCanvasViewport();
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(function markEditorViewButtonVideoTarget() {
    [...(rootRef.current?.querySelectorAll("button") ?? [])]
      .find((button) => {
        return button.textContent?.trim() === "View";
      })
      ?.setAttribute("data-video-target", "dashboard-view");
  });
  return (
    <div
      ref={rootRef}
      className={editorCss.compactDashboardEditor}
      style={{ height }}
    >
      <Puck
        config={config}
        data={data}
        height={`${height}px`}
        ui={DASHBOARD_EDITOR_INITIAL_PUCK_UI}
        iframe={{ enabled: false }}
        onAction={onAction}
        overrides={{
          puck: PuckOverride,
          headerActions: () => {
            return <EditorActions dashboardId={dashboardId} />;
          },
        }}
      />
    </div>
  );
}
