import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useCallback, useState } from "react";
import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { SharingSettingsLoading } from "@/components/permissions/ShareResourceModal/SharingSettingsLoading";
import { useShareButtonState } from "@/components/permissions/useShareButtonState";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import { PublishingActions } from "@/views/DashboardApp/DashboardShareModal/PublishingActions/PublishingActions";
import { PublishingSection } from "@/views/DashboardApp/DashboardShareModal/PublishingSection";
import { ShareableLimitReachedModal } from "@/views/DashboardApp/DashboardShareModal/ShareableLimitReachedModal/ShareableLimitReachedModal";
import { useDashboardPublishingControl } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/useDashboardPublishingControl";
import { useShareableDashboardLimit } from "@/views/DashboardApp/DashboardShareModal/useShareableDashboardLimit/useShareableDashboardLimit";
import type { ShareResourcePublishing } from "@/components/permissions/ShareResourceModal/ShareResourceModal.types";
import type { ShareableDashboardLimit } from "@/views/DashboardApp/DashboardShareModal/useShareableDashboardLimit/useShareableDashboardLimit";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type PublishingControl = ReturnType<typeof useDashboardPublishingControl>;

type Props = {
  dashboard: Dashboard.T;
  /** Publishing copies the PERSISTED config, so unsaved edits block it. */
  hasUnsavedChanges: boolean;
  onClose: () => void;
};

/**
 * Every sentence `_getPublishBlockedReason` may return. Localised by the
 * component, because a module-level helper cannot call `useLingui`.
 */
type PublishBlockedCopy = {
  offline: string;
  unsavedChanges: string;
  slugChecking: string;
  slugRejected: string;
  planLimit: string;
};

type PublishBlockedReason = {
  /** The sentence to show, or `undefined` when nothing blocks publishing. */
  reason: string | undefined;
  /**
   * Whether the PLAN is what blocks it, which is the only case where offering
   * an upgrade would actually unblock the button.
   */
  isBlockedByPlan: boolean;
};

/**
 * Why the primary publish action is unavailable, if it is.
 *
 * Mirrors the guard in `onPrimaryAction`: a slug that is still being checked,
 * or that the server has already rejected, would otherwise leave the button
 * enabled and clicking it silently do nothing.
 *
 * The plan comes last: offline and unsaved changes block whatever the plan
 * says, and offering an upgrade against those would be misleading, since
 * buying one would not unblock the button.
 */
function _getPublishBlockedReason(
  options: Readonly<{
    isOffline: boolean;
    hasUnsavedChanges: boolean;
    isBlockedByLimit: boolean;
    publishing: PublishingControl;
    copy: PublishBlockedCopy;
  }>,
): PublishBlockedReason {
  const { isOffline, hasUnsavedChanges, isBlockedByLimit, publishing, copy } =
    options;

  const otherBlockedReason =
    isOffline ? copy.offline
    : hasUnsavedChanges ? copy.unsavedChanges
    : publishing.normalisedSlug && publishing.hasPendingSlugCheck ?
      copy.slugChecking
    : publishing.normalisedSlug && publishing.isSlugRejected ? copy.slugRejected
    : undefined;

  const isBlockedByPlan = otherBlockedReason === undefined && isBlockedByLimit;

  return {
    reason:
      otherBlockedReason ?? (isBlockedByPlan ? copy.planLimit : undefined),
    isBlockedByPlan,
  };
}

/**
 * `_getPublishBlockedReason` with its sentences localised. A hook rather than
 * arguments at the call site, so the component states WHAT blocks publishing
 * without also carrying every way of saying so.
 */
function usePublishBlockedReason(
  options: Readonly<{
    isOffline: boolean;
    hasUnsavedChanges: boolean;
    limit: ShareableDashboardLimit;
    publishing: PublishingControl;
  }>,
): PublishBlockedReason {
  const { t } = useLingui();
  const maxAllowed = options.limit.maxAllowed;
  return _getPublishBlockedReason({
    isOffline: options.isOffline,
    hasUnsavedChanges: options.hasUnsavedChanges,
    isBlockedByLimit: options.limit.isBlocked,
    publishing: options.publishing,
    copy: {
      offline: t`Unavailable offline`,
      unsavedChanges: t`You cannot publish while there are unsaved changes. Save first.`,
      slugChecking: t`Checking whether that custom URL is available.`,
      slugRejected: t`Fix the custom URL before publishing.`,
      planLimit:
        maxAllowed === undefined ?
          t`Your plan does not allow sharing more dashboards.`
        : plural(maxAllowed, {
            one: "Your plan allows # shared or public dashboard.",
            other: "Your plan allows # shared or public dashboards.",
          }),
    },
  });
}

/** The dashboard-only half of the generic share modal. */
function _getPublishingProps(
  options: Readonly<{
    publishing: PublishingControl;
    blocked: PublishBlockedReason;
    publicOptionDisabledReason: string | undefined;
    onUpgrade: () => void;
  }>,
): ShareResourcePublishing {
  const { publishing, blocked, publicOptionDisabledReason, onUpgrade } =
    options;
  return {
    targetVisibility: publishing.targetVisibility,
    currentVisibility: publishing.currentDashboard.visibility,
    publicOptionDisabledReason,
    section: <PublishingSection publishing={publishing} />,
    actions: (
      <PublishingActions
        actionKind={publishing.actionKind}
        isBusy={publishing.isBusy}
        isBlockedReason={blocked.reason}
        // Offered only when the plan is what is in the way, and only as a
        // button: opening the upgrade modal on render would interrupt someone
        // who came here to change a person's role.
        onUpgrade={blocked.isBlockedByPlan ? onUpgrade : undefined}
        onPrimaryAction={publishing.onPrimaryAction}
      />
    ),
    onGeneralAccessChange: publishing.onGeneralAccessChange,
  };
}

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
  const blocked = usePublishBlockedReason({
    isOffline: offline.isBlocked,
    hasUnsavedChanges,
    limit,
    publishing,
  });

  // "Not an admin" and "we have not asked yet" are different answers, and
  // `canManageShares` collapses them into `false`. Rendering on the unknown
  // one would draw the sharing half read-only and then flip it editable when
  // the role RPC lands, which reads as the modal changing its mind about what
  // the user is allowed to do. This is the same line `ShareResourceModal`
  // shows while its own lookups are in flight.
  if (isLoadingRole) {
    return <SharingSettingsLoading />;
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
        publishing={_getPublishingProps({
          publishing,
          blocked,
          publicOptionDisabledReason:
            canPublishPublicly ? undefined : (
              t`Only workspace admins can publish to the web.`
            ),
          onUpgrade: () => {
            setIsUpgradeModalOpened(true);
          },
        })}
      />
    </>
  );
}
