import { useEffect, useRef } from "react";
import { NuxChecklistPanel } from "@/components/Nux/NuxChecklistPanel/NuxChecklistPanel";
import { useNuxCompletionEvents } from "@/components/Nux/NuxRoot/useNuxCompletionEvents";
import { useNuxHydration } from "@/components/Nux/NuxRoot/useNuxHydration";
import { useNuxNavigation } from "@/components/Nux/NuxRoot/useNuxNavigation";
import { useNuxPersistence } from "@/components/Nux/NuxRoot/useNuxPersistence";
import { getFirstUnfinishedMilestoneKey } from "@/components/Nux/NuxStateManager/nuxSelectors";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NuxTourLazy } from "@/components/Nux/NuxTour/NuxTourLazy";
import { NuxWelcomeModal } from "@/components/Nux/NuxWelcomeModal/NuxWelcomeModal";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import type { ReactNode } from "react";

/** Composes the tutorial's effects and surfaces. Assumes eligibility. */
function NuxRootContents(): ReactNode {
  const workspace = useCurrentWorkspace();
  const [state, dispatch] = NuxStateManager.useContext();
  const openMilestone = useNuxNavigation();

  useNuxHydration();
  useNuxPersistence();
  useNuxCompletionEvents();

  const loggedTerminalStatusRef = useRef<string | undefined>(undefined);
  useEffect(
    function logTerminalNuxStatus() {
      if (!state.isHydrated || !state.status) {
        return;
      }
      if (state.status !== "completed" && state.status !== "dismissed") {
        return;
      }
      if (loggedTerminalStatusRef.current === state.status) {
        return;
      }
      loggedTerminalStatusRef.current = state.status;
      if (state.status === "completed") {
        void AnalyticsClient.logEvent({
          event: "nux.completed",
          workspaceId: workspace.id,
        });
        return;
      }
      void AnalyticsClient.logEvent({
        event: "nux.dismissed",
        workspaceId: workspace.id,
        payload: {
          milestoneKey: state.activeMilestoneKey ?? null,
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

  const isInviteOpen = state.isHydrated && state.status === "not_started";

  return (
    <>
      <NuxWelcomeModal
        isOpen={isInviteOpen}
        onStart={() => {
          const firstUnfinished = getFirstUnfinishedMilestoneKey(
            state.completedMilestones,
          );
          dispatch.startTour();
          void AnalyticsClient.logEvent({
            event: "nux.started",
            workspaceId: workspace.id,
            payload: {
              startedAtMilestone: firstUnfinished ?? "add_dataset",
            },
          });
          if (firstUnfinished) {
            openMilestone(firstUnfinished);
          }
        }}
        onDecline={() => {
          dispatch.declineInvite();
        }}
      />
      <NuxChecklistPanel onOpenMilestone={openMilestone} />
      {state.activeMilestoneKey ?
        <NuxTourLazy />
      : null}
    </>
  );
}

/**
 * The onboarding tutorial's entry point.
 *
 * Renders literally nothing for an ineligible user, which also means the
 * `react-joyride` chunk is never fetched for them.
 */
export function NuxRoot(): ReactNode {
  const isEligible = useNuxEligibility();
  if (!isEligible) {
    return null;
  }
  return <NuxRootContents />;
}
