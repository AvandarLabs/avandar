import { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import { NuxProgressClient } from "@/clients/NuxProgressClient/NuxProgressClient";
import { NuxChecklistDockButton } from "@/components/Nux/NuxChecklistPanel/NuxChecklistDockButton";
import { NuxChecklistExpandedCard } from "@/components/Nux/NuxChecklistPanel/NuxChecklistExpandedCard";
import { useNuxChecklistDockRight } from "@/components/Nux/NuxChecklistPanel/useNuxChecklistDockRight";
import { useNuxMarkDoneFollowUp } from "@/components/Nux/NuxChecklistPanel/useNuxMarkDoneFollowUp";
import { nuxSelectors } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NUX_CHECKLIST_DOCK_GAP_PX } from "@/config/AppShellLayout.constants";
import { NUX_CHECKLIST_Z_INDEX } from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  onOpenMilestone: (key: NuxProgress.MilestoneKey) => void;
};

/**
 * The persistent "Get started" checklist.
 *
 * Mounted once in the workspace layout so it survives every route change.
 * Clicking a row routes to that milestone.
 */
export function NuxChecklistPanel({
  onOpenMilestone,
}: Readonly<Props>): ReactNode {
  const workspace = useCurrentWorkspace();
  const [state, dispatch] = NuxStateManager.useContext();
  const [artifacts] = NuxProgressClient.useGetWorkspaceArtifacts({
    workspaceId: workspace.id,
  });
  const { isHoldingCompletion, markDone, unmarkDone } =
    useNuxMarkDoneFollowUp();
  const dockRightPx = useNuxChecklistDockRight();
  // `bottom` is left to CSS, which adds the app-wide sticky-action-bar inset
  // to this gap. Only the gap crosses over, so the constant stays in one
  // place, and the dock does not re-render as the user scrolls a view whose
  // action bar is on screen.
  const dockStyle = {
    "--nux-dock-gap": `${NUX_CHECKLIST_DOCK_GAP_PX}px`,
    right: dockRightPx,
    zIndex: NUX_CHECKLIST_Z_INDEX,
  } as CSSProperties;
  const isFinished = nuxSelectors.areAllMilestonesComplete(
    state.completedMilestones,
  );
  if (
    !state.isHydrated ||
    state.status === "dismissed" ||
    state.status === "not_started" ||
    (isFinished && !isHoldingCompletion)
  ) {
    return null;
  }
  const completedCount = state.completedMilestones.length;
  const totalMilestoneCount = NuxProgress.milestoneKeys.length;
  if (!state.isPanelExpanded) {
    return (
      <NuxChecklistDockButton
        completedCount={completedCount}
        totalMilestoneCount={totalMilestoneCount}
        dockStyle={dockStyle}
        onExpand={() => {
          dispatch.setPanelExpanded(true);
        }}
      />
    );
  }
  return (
    <NuxChecklistExpandedCard
      artifacts={artifacts}
      completedCount={completedCount}
      dockStyle={dockStyle}
      onOpenMilestone={onOpenMilestone}
      markDone={markDone}
      unmarkDone={unmarkDone}
      totalMilestoneCount={totalMilestoneCount}
    />
  );
}
