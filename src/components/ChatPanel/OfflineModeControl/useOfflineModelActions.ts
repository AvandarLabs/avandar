import { useLingui } from "@lingui/react/macro";
import { useCallback, useState } from "react";
import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";
import { OfflineModeStore } from "@/stores/OfflineModeStore/OfflineModeStore";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";

/**
 * Downloads and removes the offline models for the offline mode control,
 * telling the user how each one went. Removing also turns offline mode off,
 * since there is nothing left to run it on.
 */
export function useOfflineModelActions(): {
  onDownload: () => Promise<void>;
  onRemove: () => Promise<void>;
  isRemoving: boolean;
} {
  const { t } = useLingui();
  const [isRemoving, setIsRemoving] = useState(false);

  const onDownload = useCallback(async () => {
    try {
      await OfflineChatEngineStore.downloadBundle();
      notifySuccess({
        title: t`Offline models downloaded`,
        message: t`Click Offline under the message box to use them. Chat also uses them on its own when you lose your connection.`,
      });
    } catch {
      notifyError({
        title: t`The offline models did not download`,
        message: t`Check your internet connection and try again.`,
      });
    }
  }, [t]);

  const onRemove = useCallback(async () => {
    setIsRemoving(true);
    OfflineModeStore.setOn(false);
    try {
      await OfflineChatEngineStore.deleteBundle();
      notifySuccess({
        title: t`Offline models removed`,
        message: t`They were deleted from this computer. You can download them again at any time.`,
      });
    } catch {
      notifyError({
        title: t`The offline models could not be removed`,
        message: t`Try again, or clear this site's data in your browser settings.`,
      });
    } finally {
      setIsRemoving(false);
    }
  }, [t]);

  return { onDownload, onRemove, isRemoving };
}
