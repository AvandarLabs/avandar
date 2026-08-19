import { useLayoutEffect } from "react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useVisibleNuxSteps } from "@/components/Nux/NuxTour/useVisibleNuxSteps/useVisibleNuxSteps";

/**
 * Opens the chat panel when the active step says the user must use it.
 *
 * Must run under `AppShell`'s inner `ChatPanelStateManager.Provider` via
 * `ChatPanel`, not from `NuxRoot` or the lazy tour chunk: those sit on the
 * the Aside does not read. Runs before paint so Joyride can spotlight the
 * composer on first entry. Steps without `openChatPanel` leave the panel in
 * whatever state the user last set.
 */
export function useNuxOpenChatPanel(): void {
  const state = NuxStateManager.useState();
  const chatPanelDispatch = ChatPanelStateManager.useDispatch();
  const visibleSteps = useVisibleNuxSteps();
  const currentStep = visibleSteps[state.activeStepIndex];
  const shouldOpenChatPanel = currentStep?.openChatPanel === true;

  useLayoutEffect(
    function openChatPanelForStep() {
      if (!shouldOpenChatPanel) {
        return;
      }
      chatPanelDispatch.open();
    },
    [
      chatPanelDispatch,
      shouldOpenChatPanel,
      state.activeMilestoneKey,
      state.activeStepIndex,
    ],
  );
}
