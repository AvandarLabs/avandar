import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

import { NuxChecklistPanel } from "@/components/Nux/NuxChecklistPanel/NuxChecklistPanel";
import { NuxCompletionModal } from "@/components/Nux/NuxCompletionModal/NuxCompletionModal";
import { useNuxCompletionCelebration } from "@/components/Nux/NuxCompletionModal/useNuxCompletionCelebration/useNuxCompletionCelebration";
import { useNuxPrerequisiteJudge } from "@/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge/useNuxPrerequisiteJudge";
import { useNuxCompletionEvents } from "@/components/Nux/NuxRoot/useNuxCompletionEvents/useNuxCompletionEvents";
import { useNuxHydration } from "@/components/Nux/NuxRoot/useNuxHydration";
import { useNuxNavigation } from "@/components/Nux/NuxRoot/useNuxNavigation";
import { useNuxPersistence } from "@/components/Nux/NuxRoot/useNuxPersistence/useNuxPersistence";
import { useNuxStatusAnalytics } from "@/components/Nux/NuxRoot/useNuxStatusAnalytics";
import { nuxSelectors } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NuxTourLazy } from "@/components/Nux/NuxTour/NuxTourLazy";
import { NuxWelcomeModal } from "@/components/Nux/NuxWelcomeModal/NuxWelcomeModal";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";

function _startFirstDashboardTour(options: {
  completedMilestones: readonly NuxProgress.MilestoneKey[];
  openMilestone: (key: NuxProgress.MilestoneKey) => void;
  startTour: () => void;
  workspaceId: Workspace.Id;
}): void {
  const firstUnfinished = nuxSelectors.getFirstUnfinishedMilestoneKey(
    options.completedMilestones,
  );
  options.startTour();
  void AnalyticsClient.logEvent({
    event: "nux.started",
    workspaceId: options.workspaceId,
    payload: {
      startedAtMilestone: firstUnfinished ?? "add_dataset",
    },
  });
  if (firstUnfinished) {
    options.openMilestone(firstUnfinished);
  }
}

/** Composes the tutorial's effects and surfaces. Assumes eligibility. */
export function NuxRootContents(): ReactNode {
  const workspace = useCurrentWorkspace();
  const [state, dispatch] = NuxStateManager.useContext();
  const openMilestone = useNuxNavigation();
  const celebration = useNuxCompletionCelebration();

  useNuxHydration();
  useNuxPrerequisiteJudge();
  useNuxPersistence();
  useNuxCompletionEvents();
  useNuxStatusAnalytics();

  const isInviteOpen = state.isHydrated && state.status === "not_started";
  return (
    <>
      <NuxWelcomeModal
        isOpen={isInviteOpen}
        onStart={() => {
          _startFirstDashboardTour({
            completedMilestones: state.completedMilestones,
            openMilestone,
            startTour: dispatch.startTour,
            workspaceId: workspace.id,
          });
        }}
        onDecline={() => {
          dispatch.declineInvite();
        }}
      />
      <NuxChecklistPanel onOpenMilestone={openMilestone} />
      <NuxCompletionModal
        isOpen={celebration.isOpen}
        onClose={celebration.onClose}
      />
      {state.activeMilestoneKey ? <NuxTourLazy /> : null}
    </>
  );
}
