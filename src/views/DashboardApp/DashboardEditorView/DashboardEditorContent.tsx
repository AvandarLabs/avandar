import { Flex } from "@mantine/core";
import { Puck } from "@puckeditor/core";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { DashboardEditorToolbar } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorToolbar";
import { ShareOnlyAccessAlert } from "@/views/DashboardApp/DashboardEditorView/ShareOnlyAccessAlert";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { DashboardEditorViewState } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView";
import type { Data } from "@puckeditor/core";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
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
  return (
    <DashboardFilterStateManager.Provider>
      <AppLayout floatingToolbar>
        <Flex direction="column" h="100%" pt={40}>
          {state.isShareOnlyAccess ?
            <ShareOnlyAccessAlert />
          : null}
          <Puck
            key={state.editorRevision}
            metadata={state.metadata}
            config={state.puckConfig}
            height="100%"
            data={state.editorData ?? state.initialEditorData}
            onChange={(data: Data) => {
              state.dispatch.updateEditorData(data as AvaPageData);
            }}
            overrides={{
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
