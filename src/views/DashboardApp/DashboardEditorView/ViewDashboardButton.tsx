import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Tooltip } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";

type Props = {
  workspaceSlug: string;
  dashboardId: DashboardId | undefined;
  /**
   * When true, the View button warns the user that previewing now will
   * lose unsaved Puck edits (preview reads the persisted config).
   */
  hasUnsavedChanges?: boolean;
};

/**
 * Opens the dashboard in a read-only preview using the same renderer the
 * public route uses. The preview route is auth-gated, so the dashboard
 * does not need to be published first — fixing the long-standing bug
 * where "View" only worked after "Publish".
 */
export function ViewDashboardButton({
  workspaceSlug,
  dashboardId,
  hasUnsavedChanges,
}: Props): JSX.Element {
  const { t } = useLingui();
  const navigate = useNavigate();

  return (
    <Tooltip
      label={t`Unsaved changes will not appear in preview. Save first.`}
      disabled={!hasUnsavedChanges}
    >
      <Button
        variant="light"
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
