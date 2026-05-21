import { msg } from "@lingui/core/macro";
import { notifications } from "@mantine/notifications";
import { useEffect, useMemo, useRef } from "react";
import { i18n } from "@/i18n/i18n";
import { useVoiceModelStatus } from "@/lib/voice/useVoiceModelManager";
import {
  findWhisperCppVoiceModel,
  isWhisperCppVoiceModelId,
} from "@/lib/voice/whisperCppVoiceModels";
import type { WhisperCppVoiceModelId } from "@/lib/voice/whisperCppVoiceModels";

const LOADING_NOTIFICATION_ID = "voice-model-loading";

/** Avoid flashing a toast when WASM init finishes in under this window. */
const LOADING_TOAST_DELAY_MS = 450;

/** Toast while a cached ggml model is loading into whisper.cpp. */
export function VoiceModelLoadingNotification(): null {
  const status = useVoiceModelStatus();
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusKey = useMemo(() => {
    if (status.kind === "loading") {
      return `loading:${status.modelId}`;
    }
    return status.kind;
  }, [status]);

  useEffect(() => {
    const clearShowTimer = (): void => {
      if (showTimerRef.current !== null) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    };

    if (statusKey.startsWith("loading:")) {
      const loadingModelId = statusKey.slice("loading:".length);
      clearShowTimer();
      showTimerRef.current = setTimeout(() => {
        if (!isWhisperCppVoiceModelId(loadingModelId)) {
          return;
        }
        const model = findWhisperCppVoiceModel(
          loadingModelId as WhisperCppVoiceModelId,
        );
        notifications.show({
          id: LOADING_NOTIFICATION_ID,
          title: i18n._(msg`Loading voice model`),
          message: i18n._(msg`Starting ${model.displayName}…`),
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });
      }, LOADING_TOAST_DELAY_MS);
      return () => {
        clearShowTimer();
      };
    }

    clearShowTimer();
    notifications.hide(LOADING_NOTIFICATION_ID);
    return undefined;
  }, [statusKey]);

  return null;
}
