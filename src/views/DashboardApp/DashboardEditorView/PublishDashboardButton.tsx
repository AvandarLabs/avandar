import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconWorld } from "@tabler/icons-react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { notifySuccess } from "@/lib/ui/notifications/notify";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import type { DashboardId } from "@/models/Dashboard/Dashboard.types";

type Props = {
  dashboardId: DashboardId | undefined;
  isPublic: boolean | undefined;
};

export function PublishDashboardButton({
  dashboardId,
  isPublic,
}: Props): JSX.Element {
  const [publishDashboard, isPublishing] = DashboardClient.useUpdate({
    onSuccess: () => {
      notifySuccess("Dashboard published!");
    },
  });

  return (
    <Button
      variant="outline"
      leftSection={<IconWorld size={16} />}
      loading={isPublishing}
      disabled={!dashboardId || isPublic === true}
      onClick={() => {
        if (!dashboardId) {
          notifyDevAlert("Dashboard is not loaded yet.");
          return;
        }

        modals.openConfirmModal({
          title: "Publish dashboard?",
          children:
            "This will make the dashboard public. You can change this later.",
          labels: { confirm: "Publish", cancel: "Cancel" },
          onConfirm: () => {
            publishDashboard({
              id: dashboardId,
              data: { isPublic: true },
            });
          },
        });
      }}
    >
      Publish
    </Button>
  );
}
