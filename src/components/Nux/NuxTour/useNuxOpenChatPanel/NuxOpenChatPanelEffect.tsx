import { useNuxOpenChatPanel } from "@/components/Nux/NuxTour/useNuxOpenChatPanel/useNuxOpenChatPanel";

/**
 * Applies tutorial step enter effects on the chat panel state AppShell reads.
 *
 * `NuxRoot` sits beside `AppShell` under an outer `ChatPanelProvider`, while
 * `AppShell` mounts its own `ChatPanelStateManager.Provider` for the Aside.
 * Opening chat from the tour would update the outer store only, so this
 * effect must run under that inner provider. `ChatPanel` is that boundary:
 * it is the Aside child that AppShell renders when chat is available, not
 * `AppShell` itself.
 */
export function NuxOpenChatPanelEffect(): null {
  useNuxOpenChatPanel();
  return null;
}
