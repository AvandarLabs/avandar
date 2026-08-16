import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { useCallback, useState } from "react";
import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { useShareButtonState } from "@/components/permissions/useShareButtonState/useShareButtonState";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import { PublishingActions } from "@/views/DashboardApp/DashboardShareModal/PublishingActions";
import { PublishingSection } from "@/views/DashboardApp/DashboardShareModal/PublishingSection";
import { ShareableLimitReachedModal } from "@/views/DashboardApp/DashboardShareModal/ShareableLimitReachedModal";
import { useDashboardPublishingControl } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl";
import { useShareableDashboardLimit } from "@/views/DashboardApp/DashboardShareModal/useShareableDashboardLimit";
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
  // The same hook the Share button uses, so the "may I write share rows" rule
  // lives in one place. It opens at `editor` so an editor can publish, but
  // writing share rows stays admin-tier: the modal renders its sharing half
  // read-only rather than refusing to open.
  const { canManageShares, isLoadingRole } = useShareButtonState({
    resourceType: "dashboard",
    resourceId: dashboard.id,
    minRole: "editor",
  });
  // Declared before the publishing hook because that hook needs the setter:
  // when the database refuses a publish the UI gate let through, the refusal
  // opens the same modal the gate's own Upgrade button opens.
  const [isUpgradeModalOpened, setIsUpgradeModalOpened] = useState(false);
  // Hoisted rather than written inline in the argument object: `useCallback`
  // called inside a literal still runs every render, and the literal is new
  // every render anyway, so inline buys no memoization at all.
  const onShareableLimitReached = useCallback(() => {
    setIsUpgradeModalOpened(true);
  }, []);
  const publishing = useDashboardPublishingControl({
    dashboard,
    onShareableLimitReached,
  });
  const limit = useShareableDashboardLimit({
    dashboard: publishing.currentDashboard,
    targetVisibility: publishing.targetVisibility,
  });
  const planLimitMessage =
    limit.maxAllowed === undefined ?
      t`Your plan does not allow sharing more dashboards.`
    : t`Your plan allows ${limit.maxAllowed} shared or public dashboard(s).`;
  // Mirrors the guard in `onPrimaryAction`: a slug that is still being
  // checked, or that the server has already rejected, would otherwise leave
  // the button enabled and clicking it silently do nothing.
  const otherBlockedReason =
    offline.isBlocked ? t`Unavailable offline`
    : hasUnsavedChanges ?
      t`You cannot publish while there are unsaved changes. Save first.`
    : publishing.normalisedSlug && publishing.hasPendingSlugCheck ?
      t`Checking whether that custom URL is available.`
    : publishing.normalisedSlug && publishing.isSlugRejected ?
      t`Fix the custom URL before publishing.`
    : undefined;
  // The plan comes last: offline and unsaved changes block whatever the plan
  // says, and offering an upgrade against those would be misleading, since
  // buying one would not unblock the button.
  const isBlockedByPlan = otherBlockedReason === undefined && limit.isBlocked;
  const isBlockedReason =
    otherBlockedReason ?? (isBlockedByPlan ? planLimitMessage : undefined);

  // "Not an admin" and "we have not asked yet" are different answers, and
  // `canManageShares` collapses them into `false`. Rendering on the unknown
  // one would draw the sharing half read-only and then flip it editable when
  // the role RPC lands, which reads as the modal changing its mind about what
  // the user is allowed to do. This is the same line `ShareResourceModal`
  // shows while its own lookups are in flight.
  if (isLoadingRole) {
    return (
      <Stack gap="md">
        <Text>
          <Trans>Loading sharing settings…</Trans>
        </Text>
      </Stack>
    );
  }

  return (
    <>
      <ShareableLimitReachedModal
        subscription={limit.subscription}
        isOpened={isUpgradeModalOpened}
        onClose={() => {
          setIsUpgradeModalOpened(false);
        }}
      />
      <ShareResourceModal
        resourceName={dashboard.name}
        resourceType="dashboard"
        resourceId={dashboard.id}
        canManageShares={canManageShares}
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
              onUpgrade={
                // Offered only when the plan is what is in the way, and only as
                // a button: opening the upgrade modal on render would interrupt
                // someone who came here to change a person's role.
                isBlockedByPlan ?
                  () => {
                    setIsUpgradeModalOpened(true);
                  }
                : undefined
              }
              onPrimaryAction={publishing.onPrimaryAction}
            />
          ),
          onGeneralAccessChange: publishing.onGeneralAccessChange,
        }}
      />
    </>
  );
}
