import { LocalChatModelStore } from "./LocalChatModelStore/LocalChatModelStore";
import { OfflineChatPickerModels } from "./offlineChatPickerModels";
import type { OfflineChatMode } from "./offlineChat.types";

export function resolveOfflineChatMode(args: {
  navigatorOnLine: boolean;
  chatPostFailed?: boolean;
  /** Active chat model picker id (includes `offline:` ids). */
  selectedChatModelId?: string;
}): OfflineChatMode {
  const hasDownloaded = LocalChatModelStore.hasAnyDownloaded();
  const pickerLocalId =
    args.selectedChatModelId ?
      OfflineChatPickerModels.parseModelId(args.selectedChatModelId)
    : undefined;

  if (pickerLocalId && LocalChatModelStore.isDownloaded(pickerLocalId)) {
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
