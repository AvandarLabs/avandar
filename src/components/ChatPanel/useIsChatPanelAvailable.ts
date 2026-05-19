import { createContext, useContext } from "react";

/**
 * React context that signals whether the calling tree is inside a
 * `ChatPanelProvider`. Provided by `ChatPanelProvider` and consumed via
 * `useIsChatPanelAvailable`.
 */
export const ChatPanelAvailableContext = createContext(false);

/**
 * Returns `true` when the calling component is rendered inside a
 * `ChatPanelProvider`. Useful for shared components like AppToolbar that
 * are rendered on both workspace and non-workspace routes and need to
 * render the chat toggle conditionally.
 */
export function useIsChatPanelAvailable(): boolean {
  return useContext(ChatPanelAvailableContext);
}
