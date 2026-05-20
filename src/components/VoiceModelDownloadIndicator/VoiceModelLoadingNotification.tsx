import { useLingui } from "@lingui/react/macro";
import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { useVoiceModelStatus } from "@/lib/voice/useVoiceModelManager";
import { findVoiceModel } from "@/lib/voice/voiceModels";

const LOADING_NOTIFICATION_ID = "voice-model-loading";

/**
 * Persistent toast while a cached voice model is warming up in memory
 * (transformers.js pipeline). Shown instead of the download progress panel.
 */
export function VoiceModelLoadingNotification(): null {
  const { t } = useLingui();
  const status = useVoiceModelStatus();

  useEffect(() => {
    if (status.kind === "loading") {
      const model = findVoiceModel(status.modelId);
      notifications.show({
        id: LOADING_NOTIFICATION_ID,
        title: t`Loading voice model`,
        message: t`Starting ${model.displayName} for voice prompting…`,
        loading: true,
        autoClose: false,
        withCloseButton: false,
      });
      return;
    }
    notifications.hide(LOADING_NOTIFICATION_ID);
  }, [status, t]);

  return null;
}
