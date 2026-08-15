import { useLingui } from "@lingui/react/macro";
import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useResourceRole } from "@/hooks/permissions/useResourceRole/useResourceRole";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import { PublishingActions } from "@/views/DashboardApp/DashboardShareModal/PublishingActions";
import { PublishingSection } from "@/views/DashboardApp/DashboardShareModal/PublishingSection";
import { useDashboardPublishingControl } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T;
  /** Publishing copies the PERSISTED config, so unsaved edits block it. */
  hasUnsavedChanges: boolean;
  onClose: () => void;
};

/**
 * The dashboard flavour of the share modal: the resource-generic modal plus
 * the publishing section it renders for dashboards only.
 *
 * Only publishing is gated on unsaved changes and connectivity; sharing itself
 * keeps working, because a share write touches no snapshot.
 */
export function DashboardShareModal({
  dashboard,
  hasUnsavedChanges,
  onClose,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const offline = useOfflineGate();
  const canPublishPublicly = useHasPermission(
    "dashboards__can_publish_publicly",
  );
  // The button opens at `editor` so an editor can publish, but writing share
  // rows stays admin-tier: the modal renders its sharing half read-only rather
  // than refusing to open.
  const [effectiveRole] = useResourceRole({
    resourceType: "dashboard",
    resourceId: dashboard.id,
  });
  const publishing = useDashboardPublishingControl({ dashboard });
  // Mirrors the guard in `onPrimaryAction`: a slug that is still being
  // checked, or that the server has already rejected, would otherwise leave
  // the button enabled and clicking it silently do nothing.
  const isBlockedReason =
    offline.isBlocked ? t`Unavailable offline`
    : hasUnsavedChanges ?
      t`You cannot publish while there are unsaved changes. Save first.`
    : publishing.normalisedSlug && publishing.hasPendingSlugCheck ?
      t`Checking whether that custom URL is available.`
    : publishing.normalisedSlug && publishing.isSlugRejected ?
      t`Fix the custom URL before publishing.`
    : undefined;

  return (
    <ShareResourceModal
      resourceName={dashboard.name}
      resourceType="dashboard"
      resourceId={dashboard.id}
      canManageShares={effectiveRole === "admin"}
      onClose={onClose}
      publishing={{
        targetVisibility: publishing.targetVisibility,
        currentVisibility: publishing.currentDashboard.visibility,
        publicOptionDisabledReason:
          canPublishPublicly ? undefined : (
            t`Only workspace admins can publish to the web.`
          ),
        section: <PublishingSection publishing={publishing} />,
        actions: (
          <PublishingActions
            actionKind={publishing.actionKind}
            isBusy={publishing.isBusy}
            isBlockedReason={isBlockedReason}
            onPrimaryAction={publishing.onPrimaryAction}
          />
        ),
        onGeneralAccessChange: publishing.onGeneralAccessChange,
      }}
    />
  );
}
