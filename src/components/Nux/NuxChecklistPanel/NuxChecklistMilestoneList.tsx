import type { NuxWorkspaceArtifacts } from "@/clients/NuxProgressClient/NuxProgressClient";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";

import { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import { NuxChecklistMilestoneRow } from "@/components/Nux/NuxChecklistPanel/NuxChecklistMilestoneRow/NuxChecklistMilestoneRow";
import { nuxSelectors } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";

type Props = {
  artifacts: NuxWorkspaceArtifacts | undefined;
  markDone: (key: NuxProgress.MilestoneKey) => void;
  onOpenMilestone: (key: NuxProgress.MilestoneKey) => void;
  unmarkDone: (key: NuxProgress.MilestoneKey) => void;
};

/** Milestone rows for the expanded Get started card. */
export function NuxChecklistMilestoneList({
  artifacts,
  markDone,
  onOpenMilestone,
  unmarkDone,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const state = NuxStateManager.useState();
  return (
    <>
      {FIRST_DASHBOARD_MILESTONES.map((milestone) => {
        const isDone = state.completedMilestones.includes(milestone.key);
        const prerequisitesMet = nuxSelectors.areMilestonePrerequisitesMet(
          milestone,
          state.completedMilestones,
        );
        const shareDashboardBlocked =
          milestone.key === "share_dashboard" &&
          prerequisitesMet &&
          artifacts?.hasDashboard !== true;
        const isLocked =
          !isDone && (!prerequisitesMet || shareDashboardBlocked);
        return (
          <NuxChecklistMilestoneRow
            key={milestone.key}
            milestone={milestone}
            isDone={isDone}
            isLocked={isLocked}
            lockedTooltip={
              shareDashboardBlocked
                ? t`You can't go to this step until you create a new dashboard.`
                : undefined
            }
            onOpen={() => {
              onOpenMilestone(milestone.key);
            }}
            onToggleDone={() => {
              if (isDone) {
                unmarkDone(milestone.key);
                return;
              }
              markDone(milestone.key);
            }}
          />
        );
      })}
    </>
  );
}
