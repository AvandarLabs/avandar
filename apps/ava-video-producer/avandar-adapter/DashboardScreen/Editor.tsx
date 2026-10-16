import { Button } from "@mantine/core";
import { Puck } from "@puckeditor/core";
import { IconShare, IconTrash } from "@tabler/icons-react";
import { useLayoutEffect, useRef } from "react";
import { DASHBOARD_EDITOR_INITIAL_PUCK_UI } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView.constants";
import editorCss from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView.module.css";
import { SaveDashboardButton } from "@/views/DashboardApp/DashboardEditorView/SaveDashboardButton/SaveDashboardButton";
import { useFullWidthCanvasViewport } from "@/views/DashboardApp/DashboardEditorView/useFullWidthCanvasViewport/useFullWidthCanvasViewport";
import { ViewDashboardButton } from "@/views/DashboardApp/DashboardEditorView/ViewDashboardButton";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { useDashboardPuckConfig } from "@/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig";

const _noop = () => {};

type Props = {
  config: ReturnType<typeof useDashboardPuckConfig>;
  data: AvaPageData;
  dashboardId: Dashboard.Id;
  height: number;
};

/** The compact Puck editor surface, with the product's exact save/share/view/delete header actions. */
export function Editor({ config, data, dashboardId, height }: Props) {
  const { onAction, PuckOverride } = useFullWidthCanvasViewport();
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(function markEditorViewButtonVideoTarget() {
    [...(rootRef.current?.querySelectorAll("button") ?? [])]
      .find((button) => button.textContent?.trim() === "View")
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
          headerActions: () => (
            <>
              <SaveDashboardButton onSave={_noop} />
              {/* Exact visible draft button markup from DashboardShareButton and
            DeleteDashboardButton; neither action is activated in this film. */}
              <Button
                size="compact-sm"
                variant="default"
                leftSection={<IconShare size={16} />}
              >
                Share
              </Button>
              <span
                data-video-target="dashboard-view"
                style={{ display: "inline-flex" }}
              >
                <ViewDashboardButton
                  workspaceSlug="avandar-labs"
                  dashboardId={dashboardId}
                  hasUnsavedChanges={false}
                />
              </span>
              <Button
                size="compact-sm"
                variant="light"
                color="danger"
                leftSection={<IconTrash size={16} />}
              >
                Delete
              </Button>
            </>
          ),
        }}
      />
    </div>
  );
}
