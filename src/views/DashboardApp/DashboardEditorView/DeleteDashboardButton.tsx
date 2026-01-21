import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { notifySuccess } from "@/lib/ui/notifications/notify";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import type { DashboardId } from "@/models/Dashboard/Dashboard.types";

type Props = {
  workspaceSlug: string;
  dashboardId: DashboardId | undefined;
};

export function DeleteDashboardButton({
  workspaceSlug,
  dashboardId,
}: Props): JSX.Element {
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
      notifySuccess("Dashboard deleted successfully!");
      await navigate({
        to: "/$workspaceSlug/dashboards",
        params: { workspaceSlug },
      });
    },
  });

  return (
    <Button
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
          title: "Delete dashboard?",
          children: "This cannot be undone.",
          labels: { confirm: "Delete", cancel: "Cancel" },
          confirmProps: { color: "danger" },
          onConfirm: () => {
            deleteDashboard({ id: dashboardId });
          },
        });
      }}
    >
      Delete
    </Button>
  );
}
