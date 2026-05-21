import {
  hasAnyDownloadedLocalChatModel,
  isLocalChatModelMarkedDownloaded,
} from "./localChatModelStore";
import { parseOfflineChatPickerModelId } from "./offlineChatPickerModels";
import type { OfflineChatMode } from "./offlineChat.types";

export function resolveOfflineChatMode(args: {
  navigatorOnLine: boolean;
  chatPostFailed?: boolean;
  /** Active chat model picker id (includes `offline:` ids). */
  selectedChatModelId?: string;
}): OfflineChatMode {
  const hasDownloaded = hasAnyDownloadedLocalChatModel();
  const pickerLocalId =
    args.selectedChatModelId ?
      parseOfflineChatPickerModelId(args.selectedChatModelId)
    : undefined;

  if (pickerLocalId && isLocalChatModelMarkedDownloaded(pickerLocalId)) {
    return { kind: "local", localChatModelId: pickerLocalId };
  }

  if (!args.navigatorOnLine) {
    return hasDownloaded ? { kind: "local" } : { kind: "cloud" };
  }

  if (args.chatPostFailed && hasDownloaded) {
    return { kind: "offer_local_fallback" };
  }

  return { kind: "cloud" };
}
