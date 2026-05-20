import { useLingui } from "@lingui/react/macro";
import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { useWhisperCppVoiceModelStatus } from "@/lib/voiceWhisperCpp/useWhisperCppVoiceModelManager";
import { findVoiceModel } from "@/lib/voice/voiceModels";

const LOADING_NOTIFICATION_ID = "whisper-cpp-voice-model-loading";

/** Toast while a cached ggml model is loading into the whisper.cpp worker. */
export function WhisperCppVoiceModelLoadingNotification(): null {
  const { t } = useLingui();
  const status = useWhisperCppVoiceModelStatus();

  useEffect(() => {
    if (status.kind === "loading") {
      const model = findVoiceModel(status.modelId);
      notifications.show({
        id: LOADING_NOTIFICATION_ID,
        title: t`Loading whisper.cpp model`,
        message: t`Starting ${model.displayName} in WASM worker…`,
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
