import { hasAnyDownloadedLocalChatModel } from "./localChatModelStore";
import type { OfflineChatMode } from "./offlineChat.types";

export function resolveOfflineChatMode(args: {
  navigatorOnLine: boolean;
  chatPostFailed?: boolean;
}): OfflineChatMode {
  const hasDownloaded = hasAnyDownloadedLocalChatModel();

  if (!args.navigatorOnLine) {
    return hasDownloaded ? { kind: "local" } : { kind: "cloud" };
  }

  if (args.chatPostFailed && hasDownloaded) {
    return { kind: "offer_local_fallback" };
  }

  return { kind: "cloud" };
}
