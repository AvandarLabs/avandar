import { isHiddenChatThreadMessage } from "@/components/ChatPanel/ChatThread/isHiddenChatThreadMessage";

/**
 * Returns whether a thread has nothing for the user to read. Hidden messages
 * (view-change events, Case Manager kickoffs, discovery continuations) still
 * count as messages to the runtime, so the runtime's own `isEmpty` turns false
 * the moment the page context is synced. The empty state keys off this
 * instead.
 */
export function isChatThreadVisiblyEmpty(
  messages: ReadonlyArray<Parameters<typeof isHiddenChatThreadMessage>[0]>,
): boolean {
  return messages.every(isHiddenChatThreadMessage);
}
