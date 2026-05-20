import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { notifyDevAlert, notifySuccess } from "@ui";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DASHBOARD_TOOLBAR_BUTTON_SIZE } from "@/views/DashboardApp/DashboardEditorView/dashboardToolbarButtonSize";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";

type Props = {
  workspaceSlug: string;
  dashboardId: DashboardId | undefined;
};

export function DeleteDashboardButton({
  workspaceSlug,
  dashboardId,
}: Props): JSX.Element {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [deleteDashboard, isDeleting] = DashboardClient.useDelete({
    queriesToInvalidate:
      dashboardId ?
        [
          DashboardClient.QueryKeys.getAll(),
          DashboardClient.QueryKeys.getById({ id: dashboardId }),
        ]
      : undefined,
    onSuccess: async () => {
      notifySuccess(t`Dashboard deleted successfully!`);
      await navigate({
        to: "/$workspaceSlug/dashboards",
        params: { workspaceSlug },
      });
    },
  });

  return (
    <Button
      size={DASHBOARD_TOOLBAR_BUTTON_SIZE}
      variant="light"
      color="danger"
      leftSection={<IconTrash size={16} />}
      loading={isDeleting}
      disabled={!dashboardId}
      onClick={() => {
        if (!dashboardId) {
          notifyDevAlert("Dashboard is not loaded yet.");
          return;
        }

        modals.openConfirmModal({
          title: t`Delete dashboard?`,
          children: t`This cannot be undone.`,
          labels: { confirm: t`Delete`, cancel: t`Cancel` },
          confirmProps: { color: "danger" },
          onConfirm: () => {
            deleteDashboard({ id: dashboardId });
          },
        });
      }}
    >
      <Trans>Delete</Trans>
    </Button>
  );
}
