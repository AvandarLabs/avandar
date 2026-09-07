import { DASHBOARD_TOOLBAR_BUTTON_SIZE } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView.constants";
import { DeleteDashboardButton } from "@/views/DashboardApp/DashboardEditorView/DeleteDashboardButton";
import { ExportPdfButton } from "@/views/DashboardApp/DashboardEditorView/ExportPdfButton";
import { SaveDashboardButton } from "@/views/DashboardApp/DashboardEditorView/SaveDashboardButton/SaveDashboardButton";
import { ViewDashboardButton } from "@/views/DashboardApp/DashboardEditorView/ViewDashboardButton";
import { DashboardShareButton } from "@/views/DashboardApp/DashboardShareModal/DashboardShareButton";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ReactElement } from "react";

type Props = {
  dashboard: Dashboard.T;
  workspaceSlug: string;
  hasUnsavedChanges: boolean;
  onSave: (data: AvaPageData) => void;
};

/** The editor's persistence and publication actions, in Puck's header slot. */
export function DashboardEditorToolbar({
  dashboard,
  workspaceSlug,
  hasUnsavedChanges,
  onSave,
}: Readonly<Props>): ReactElement {
  return (
    <>
      <SaveDashboardButton onSave={onSave} />
      <DashboardShareButton
        dashboard={dashboard}
        hasUnsavedChanges={hasUnsavedChanges}
        size={DASHBOARD_TOOLBAR_BUTTON_SIZE}
      />
      <ViewDashboardButton
        workspaceSlug={workspaceSlug}
        dashboardId={dashboard.id}
        hasUnsavedChanges={hasUnsavedChanges}
      />
      <ExportPdfButton
        dashboard={dashboard}
        hasUnsavedChanges={hasUnsavedChanges}
      />
      <DeleteDashboardButton
        workspaceSlug={workspaceSlug}
        dashboardId={dashboard.id}
      />
    </>
  );
}
