import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DASHBOARD_TOOLBAR_BUTTON_SIZE } from "@/views/DashboardApp/DashboardEditorView/dashboardToolbarButtonSize";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactElement } from "react";

type Props = {
  workspaceSlug: string;
  dashboardId: Dashboard.Id | undefined;
};

export function DeleteDashboardButton({
  workspaceSlug,
  dashboardId,
}: Props): ReactElement {
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
          notifyError({ message: "Dashboard is not loaded yet." });
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
