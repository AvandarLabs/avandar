import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconWorld } from "@tabler/icons-react";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import { notifyError } from "@/utils/notifications/notify";
import { DASHBOARD_TOOLBAR_BUTTON_SIZE } from "@/views/DashboardApp/DashboardEditorView/dashboardToolbarButtonSize";
import { PublishDashboardModal } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactElement } from "react";

type Props = {
  dashboard: Dashboard.T | undefined;
  hasUnsavedChanges: boolean;
};

/**
 * Publish button for the dashboard editor. Opens the publish modal where
 * the user can:
 *   - Pick an optional vanity URL slug.
 *   - Copy the share URL to clipboard.
 *   - Generate a QR code for flyers / reports.
 *
 * Disabled until the dashboard is loaded and any pending edits have been
 * saved, since publishing copies the persisted config (not the in-memory
 * edits) to the public bucket. Uses `data-disabled` + `aria-disabled` so
 * the tooltip explaining the disabled state can still fire on hover.
 */
export function PublishDashboardButton({
  dashboard,
  hasUnsavedChanges,
}: Props): ReactElement {
  const { t } = useLingui();
  const offline = useOfflineGate();
  const isDisabled: boolean =
    !dashboard || hasUnsavedChanges || offline.isBlocked;

  return (
    <OfflineGated>
      <Tooltip
        label={t`You cannot publish while there are unsaved changes. Save first.`}
        disabled={!hasUnsavedChanges || offline.isBlocked}
      >
        <Button
          size={DASHBOARD_TOOLBAR_BUTTON_SIZE}
          variant={dashboard?.isPublic ? "filled" : "outline"}
          color={dashboard?.isPublic ? "teal" : undefined}
          leftSection={<IconWorld size={16} />}
          data-disabled={isDisabled || undefined}
          aria-disabled={isDisabled || undefined}
          onClick={(event) => {
            if (offline.isBlocked) {
              event.preventDefault();
              return;
            }
            if (!dashboard) {
              event.preventDefault();
              notifyError({ message: "Dashboard is not loaded yet." });
              return;
            }
            if (hasUnsavedChanges) {
              event.preventDefault();
              return;
            }

            const modalId = `publish-dashboard-${dashboard.id}`;
            modals.open({
              modalId,
              title:
                dashboard.isPublic ? t`Manage sharing` : t`Publish dashboard`,
              size: "lg",
              children: (
                <PublishDashboardModal
                  dashboard={dashboard}
                  modalId={modalId}
                  onClose={() => {
                    modals.close(modalId);
                  }}
                />
              ),
            });
          }}
        >
          {dashboard?.isPublic ?
            <Trans>Published</Trans>
          : <Trans>Publish</Trans>}
        </Button>
      </Tooltip>
    </OfflineGated>
  );
}
