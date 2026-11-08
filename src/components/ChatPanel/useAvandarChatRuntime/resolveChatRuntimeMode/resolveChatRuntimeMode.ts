import type { ChatRuntimeMode } from "$/types/offlineChat.types";

/**
 * Picks where a chat turn runs: on the server, on the offline models, or
 * (after a failed cloud request) an offer to switch to the offline models.
 * Called by the chat model adapter before each turn and again when the
 * cloud request fails.
 */
export function resolveChatRuntimeMode(
  options: Readonly<{
    navigatorOnLine: boolean;
    isOfflineModeOn: boolean;
    isBundleDownloaded: boolean;
    chatPostFailed?: boolean;
  }>,
): ChatRuntimeMode {
  if (options.isOfflineModeOn) {
    return { kind: "local" };
  }
  if (!options.navigatorOnLine) {
    return options.isBundleDownloaded ? { kind: "local" } : { kind: "cloud" };
  }
  if (options.chatPostFailed && options.isBundleDownloaded) {
    return { kind: "offer_local_fallback" };
  }
  return { kind: "cloud" };
}
