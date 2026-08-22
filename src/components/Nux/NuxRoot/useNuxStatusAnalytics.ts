import { useEffect, useRef } from "react";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";

/**
 * Logs `nux.completed` and `nux.dismissed` only on a live status transition.
 *
 * A per-mount "have I logged this yet" guard is not enough: a fresh mount
 * gets a fresh ref, hydration reads `completed` back from the database, and
 * a finished user would emit a new `nux.completed` every time they open the
 * app. Only a transition counts.
 */
export function useNuxStatusAnalytics(): void {
  const workspace = useCurrentWorkspace();
  const state = NuxStateManager.useState();
  const previousStatusRef = useRef<NuxAppState["status"]>(undefined);
  useEffect(
    function logTerminalNuxStatus() {
      if (!state.isHydrated || !state.status) {
        return;
      }
      const previousStatus = previousStatusRef.current;
      previousStatusRef.current = state.status;
      const isTransition =
        previousStatus !== undefined && previousStatus !== state.status;
      if (!isTransition) {
        return;
      }
      if (state.status === "completed") {
        void AnalyticsClient.logEvent({
          event: "nux.completed",
          workspaceId: workspace.id,
        });
        return;
      }
      if (state.status !== "dismissed") {
        return;
      }
      void AnalyticsClient.logEvent({
        event: "nux.dismissed",
        workspaceId: workspace.id,
        payload: {
          milestoneKey: state.activeMilestoneKey,
          completedCount: state.completedMilestones.length,
        },
      });
    },
    [
      state.isHydrated,
      state.status,
      state.activeMilestoneKey,
      state.completedMilestones.length,
      workspace.id,
    ],
  );
}
