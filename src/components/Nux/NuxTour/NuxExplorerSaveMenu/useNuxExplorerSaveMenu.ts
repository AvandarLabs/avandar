import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NuxExplorerSaveMenu } from "@/components/Nux/NuxTour/nuxExplorerSaveMenu/nuxExplorerSaveMenu";
import { useNuxStepFacts } from "@/components/Nux/NuxTour/useNuxStepFacts";

/**
 * NUX flags the Data Explorer Save menu needs while `build_dashboard` is
 * open. Must run under `NuxStateManager`, on the menu itself.
 */
export function useNuxExplorerSaveMenu(): {
  shouldHoldOpen: boolean;
  shouldForceCreateMode: boolean;
} {
  const state = NuxStateManager.useState();
  const facts = useNuxStepFacts();
  return {
    shouldHoldOpen: NuxExplorerSaveMenu.shouldHoldOpen({
      activeMilestoneKey: state.activeMilestoneKey,
      activeStepIndex: state.activeStepIndex,
      facts,
    }),
    shouldForceCreateMode: NuxExplorerSaveMenu.shouldForceCreateMode({
      activeMilestoneKey: state.activeMilestoneKey,
    }),
  };
}
