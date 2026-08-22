import type { QueryKey } from "@tanstack/react-query";

import { useLingui } from "@lingui/react/macro";

import { getNuxWorkspaceArtifactsQueryKey } from "@/clients/NuxProgressClient/NuxProgressClient";
import { ResourceShareClient } from "@/clients/permissions/ResourceShareClient";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { isShareableDashboardLimitError } from "@/utils/isShareableDashboardLimitError/isShareableDashboardLimitError";
import { notifyError } from "@/utils/notifications/notify";

export type ResourceShareMutations = {
  upsertShare: ReturnType<typeof ResourceShareClient.useUpsertResourceShare>[0];
  isUpserting: boolean;
  deleteShare: ReturnType<typeof ResourceShareClient.useDeleteResourceShare>[0];
  setRestricted: ReturnType<
    typeof ResourceShareClient.useSetResourceRestricted
  >[0];
};

/**
 * The three writes the share modal can make, each with the message it shows
 * when the database refuses it.
 *
 * @param queriesToInvalidate The sharing-state key every one of them writes
 *   through, so a successful write is reflected without a manual refetch.
 */
export function useResourceShareMutations(
  queriesToInvalidate: readonly QueryKey[],
): ResourceShareMutations {
  const { t } = useLingui();
  const invalidateKeys = [
    ...queriesToInvalidate,
    getNuxWorkspaceArtifactsQueryKey(),
  ];

  const [upsertShare, isUpserting] = ResourceShareClient.useUpsertResourceShare(
    {
      queriesToInvalidate: invalidateKeys,
      onError: (error: Error) => {
        // Adding the first non-owner reader to a published, self-only
        // dashboard makes it reachable by somebody else, which is exactly what
        // the plan caps. Nothing gates this write in the UI, so the database
        // trigger is where the user meets the limit, and the generic message
        // would leave them with no idea why.
        //
        // A toast rather than the upgrade modal: the person is in the middle
        // of handing out access, and the design puts the upgrade offer on the
        // publish action, which is where the limit is actually about to be
        // spent.
        if (isShareableDashboardLimitError(error)) {
          notifyError({
            title: t`Shared dashboard limit reached`,
            message: t`Your plan does not allow sharing this dashboard with anyone else. Upgrade your plan, or unshare another dashboard, and try again.`,
          });
          NuxEvents.emit("dashboard.shareBlocked", {
            reason: "shareable_dashboard_limit",
          });
          return;
        }
        notifyError({ title: t`Share failed`, message: error.message });
      },
    },
  );

  const [deleteShare] = ResourceShareClient.useDeleteResourceShare({
    queriesToInvalidate: invalidateKeys,
    onError: (error: Error) => {
      notifyError({ title: t`Remove failed`, message: error.message });
    },
  });

  const [setRestricted] = ResourceShareClient.useSetResourceRestricted({
    queriesToInvalidate: invalidateKeys,
    onError: (error: Error) => {
      notifyError({
        title: t`Restriction update failed`,
        message: error.message,
      });
    },
  });

  return { upsertShare, isUpserting, deleteShare, setRestricted };
}
