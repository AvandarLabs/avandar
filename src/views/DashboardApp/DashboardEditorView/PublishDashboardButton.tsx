import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconWorld } from "@tabler/icons-react";
import { notifyDevAlert, notifySuccess, Tooltip } from "@ui";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { useOfflineGate } from "@/lib/offline/useOfflineGate";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";

type Props = {
  dashboardId: DashboardId | undefined;
  hasUnsavedChanges: boolean;
};

/**
 * Publish button for the dashboard editor. Disabled until the dashboard is
 * loaded and any pending edits have been saved, since publishing copies the
 * persisted config (not the in-memory edits) to the public bucket. Uses
 * `data-disabled` + `aria-disabled` rather than HTML `disabled` so the
 * tooltip explaining the disabled state can still fire on hover.
 */
export function PublishDashboardButton({
  dashboardId,
  hasUnsavedChanges,
}: Props): JSX.Element {
  const [publishDashboard, isPublishing] = DashboardClient.usePublishDashboard({
    onSuccess: () => {
      notifySuccess("Dashboard published!");
    },
  });

  const offline = useOfflineGate("Publishing requires an internet connection.");
  const isDisabled: boolean =
    !dashboardId || hasUnsavedChanges || offline.isBlocked;

  return (
    <Tooltip
      label={
        offline.isBlocked ?
          offline.tooltip
        : "You cannot publish while there are unsaved changes. Save first."
      }
      disabled={!hasUnsavedChanges && !offline.isBlocked}
    >
      <Button
        variant="outline"
        leftSection={<IconWorld size={16} />}
        loading={isPublishing}
        data-disabled={isDisabled || undefined}
        aria-disabled={isDisabled || undefined}
        onClick={(event) => {
          if (offline.isBlocked) {
            event.preventDefault();
            return;
          }
          if (!dashboardId) {
            event.preventDefault();
            notifyDevAlert("Dashboard is not loaded yet.");
            return;
          }
          if (hasUnsavedChanges) {
            event.preventDefault();
            return;
          }

          modals.openConfirmModal({
            title: "Publish dashboard?",
            children:
              "This will make the dashboard public. You can change this later.",
            labels: { confirm: "Publish", cancel: "Cancel" },
            onConfirm: () => {
              publishDashboard({
                dashboardId,
              });
            },
          });
        }}
      >
        Publish
      </Button>
    </Tooltip>
  );
}
