import { useEffect } from "react";

import { OfflineChatPickerModels } from "@/components/ChatPanel/offlineChatHelpers/OfflineChatPickerModels/OfflineChatPickerModels";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";

/** Keeps the selected local model synchronized with the offline model store. */
export function usePersistSelectedOfflineModel(resolvedModelId: string): void {
  useEffect(
    function persistSelectedOfflineModel() {
      const localModelId =
        OfflineChatPickerModels.parseModelId(resolvedModelId);
      if (localModelId) {
        LocalChatModelStore.writeSelectedId(localModelId);
      }
    },
    [resolvedModelId],
  );
}
