import { Flex } from "@mantine/core";
import { Puck } from "@puckeditor/core";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { CanvasAgGridStyles } from "@/views/DashboardApp/DashboardEditorView/CanvasAgGridStyles";
import { DashboardEditorToolbar } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorToolbar";
import { DASHBOARD_EDITOR_INITIAL_PUCK_UI } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView.constants";
import css from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView.module.css";
import { ShareOnlyAccessAlert } from "@/views/DashboardApp/DashboardEditorView/ShareOnlyAccessAlert";
import { useFullWidthCanvasViewport } from "@/views/DashboardApp/DashboardEditorView/useFullWidthCanvasViewport/useFullWidthCanvasViewport";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { DashboardEditorViewState } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView";
import type { Data } from "@puckeditor/core";
import type { ReactElement } from "react";

type Props = {
  dashboard: Dashboard.T;
  state: DashboardEditorViewState;
  workspaceSlug: string;
};

/** The Puck editor surface, its toolbar, and the shared-access notice. */
export function DashboardEditorContent({
  dashboard,
  state,
  workspaceSlug,
}: Readonly<Props>): ReactElement {
  const { onAction: onPuckAction, PuckOverride: FullWidthCanvasOverride } =
    useFullWidthCanvasViewport();

  return (
    <DashboardFilterStateManager.Provider>
      <AppLayout floatingToolbar>
        <Flex
          className={css.compactDashboardEditor}
          direction="column"
          h="100%"
          pt={40}
        >
          {state.isShareOnlyAccess ? <ShareOnlyAccessAlert /> : null}
          <Puck
            key={state.editorRevision}
            metadata={state.metadata}
            config={state.puckConfig}
            height="100%"
            ui={DASHBOARD_EDITOR_INITIAL_PUCK_UI}
            data={state.editorData ?? state.initialEditorData}
            onChange={(data: Data) => {
              state.dispatch.updateEditorData(data as AvaPageData);
            }}
            onAction={onPuckAction}
            overrides={{
              iframe: CanvasAgGridStyles,
              puck: FullWidthCanvasOverride,
              headerActions: () => {
                return (
                  <DashboardEditorToolbar
                    dashboard={dashboard}
                    workspaceSlug={workspaceSlug}
                    hasUnsavedChanges={state.hasUnsavedChanges}
                    onSave={state.onSave}
                  />
                );
              },
            }}
          />
        </Flex>
      </AppLayout>
    </DashboardFilterStateManager.Provider>
  );
}
