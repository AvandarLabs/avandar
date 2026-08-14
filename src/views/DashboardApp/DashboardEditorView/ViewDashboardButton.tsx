import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Tooltip } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { DASHBOARD_TOOLBAR_BUTTON_SIZE } from "@/views/DashboardApp/DashboardEditorView/DashboardEditorView.constants";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactElement } from "react";

type Props = {
  workspaceSlug: string;
  dashboardId: Dashboard.Id | undefined;
  /**
   * When true, the View button warns the user that previewing now will
   * lose unsaved Puck edits (preview reads the persisted config).
   */
  hasUnsavedChanges?: boolean;
};

/**
 * Opens the dashboard in a read-only preview using the same renderer the
 * public route uses. The preview route is auth-gated, so the dashboard
 * does not need to be published first: fixing the long-standing bug
 * where "View" only worked after "Publish".
 */
export function ViewDashboardButton({
  workspaceSlug,
  dashboardId,
  hasUnsavedChanges,
}: Props): ReactElement {
  const { t } = useLingui();
  const navigate = useNavigate();

  return (
    <Tooltip
      label={t`Unsaved changes will not appear in preview. Save first.`}
      disabled={!hasUnsavedChanges}
    >
      <Button
        size={DASHBOARD_TOOLBAR_BUTTON_SIZE}
        variant="default"
        leftSection={<IconEye size={16} />}
        disabled={!dashboardId}
        onClick={() => {
          if (!dashboardId) {
            return;
          }
          navigate({
            to: "/$workspaceSlug/dashboards/preview/$dashboardId",
            params: { workspaceSlug, dashboardId },
          });
        }}
      >
        <Trans>View</Trans>
      </Button>
    </Tooltip>
  );
}
