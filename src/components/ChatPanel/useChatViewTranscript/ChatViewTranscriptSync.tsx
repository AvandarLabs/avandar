import { useChatViewTranscript } from "@/components/ChatPanel/useChatViewTranscript/useChatViewTranscript";

/** Syncs the current page snapshot into the live thread and renders nothing. */
export function ChatViewTranscriptSync(): null {
  useChatViewTranscript();
  return null;
}
