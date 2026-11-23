import { Button } from "@mantine/core";
import { IconShare, IconTrash } from "@tabler/icons-react";
import { SaveDashboardButton } from "@/views/DashboardApp/DashboardEditorView/SaveDashboardButton/SaveDashboardButton";
import { ViewDashboardButton } from "@/views/DashboardApp/DashboardEditorView/ViewDashboardButton";
import css from "./EditorActions.module.css";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = { dashboardId: Dashboard.Id };
const _noop = () => {};
/**
 * Render the product draft actions; share and delete remain inactive fixtures.
 */
export function EditorActions({ dashboardId }: Readonly<Props>): ReactNode {
  return (
    <>
      <SaveDashboardButton onSave={_noop} />
      <Button
        size="compact-sm"
        variant="default"
        leftSection={<IconShare size={16} />}
      >
        Share
      </Button>
      <span
        data-video-target="dashboard-view"
        className={css.editorActionsViewAction}
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
  );
}
