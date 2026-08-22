import { useEffect } from "react";

import { ChatModelStorage } from "@/components/ChatPanel/ChatModelStorage/ChatModelStorage";

/** Persists the resolved model id when the stored selection differs. */
export function useWriteResolvedModelIdToStorage(
  resolvedModelId: string,
): void {
  useEffect(
    function writeResolvedModelIdToStorage() {
      if (ChatModelStorage.readStoredChatModelId() !== resolvedModelId) {
        ChatModelStorage.writeStoredChatModelId(resolvedModelId);
      }
    },
    [resolvedModelId],
  );
}
