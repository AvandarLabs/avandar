import type { NuxEvent } from "@/components/Nux/NuxEvents/NuxEvents";

import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef } from "react";

import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { onNuxCompletionEvent } from "@/components/Nux/NuxRoot/useNuxCompletionEvents/onNuxCompletionEvent";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Advances the tutorial when a real outcome lands.
 *
 * The subscription exists only while the tutorial is mounted, which is what
 * makes `NuxEvents.emit` free for everyone else: with no subscriber, the
 * production call sites do nothing at all.
 */
export function useNuxCompletionEvents(): void {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const state = NuxStateManager.useState();
  const dispatch = NuxStateManager.useDispatch();
  const shareBlockedReason = t`Your plan does not allow sharing another dashboard. You can upgrade, or unshare another dashboard, and come back to this.`;

  // The subscription is deliberately registered once per mount, so its listener
  // cannot read `state` directly without capturing the mount-render value. This
  // ref is how the listener sees the live status and completion set.
  const latestStateRef = useRef(state);
  useEffect(
    function trackLatestNuxState() {
      latestStateRef.current = state;
    },
    [state],
  );

  useEffect(
    function subscribeToNuxEvents() {
      return NuxEvents.subscribe((event: NuxEvent) => {
        onNuxCompletionEvent({
          dispatch,
          event,
          latestState: latestStateRef.current,
          shareBlockedReason,
          workspaceId: workspace.id,
        });
      });
    },
    [dispatch, shareBlockedReason, workspace.id],
  );
}
