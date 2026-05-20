import type { VoiceModelId } from "@/lib/voice/voiceModels";

/** Same Hugging Face repo as desktop `createWhisperService`. */
export const WHISPER_GGML_REPO_BASE =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";

/** App-facing voice model ids mapped to ggml file stems. */
export const WHISPER_MODEL_ID_TO_GGML_NAME: Readonly<
  Record<VoiceModelId, string>
> = {
  "whisper-tiny": "tiny",
  "whisper-base": "base",
  "whisper-small": "small",
  "whisper-medium": "medium",
  "whisper-large-v3": "large-v3",
  "whisper-large-v3-turbo": "large-v3-turbo",
};

export function ggmlFileNameForVoiceModelId(modelId: VoiceModelId): string {
  const ggml = WHISPER_MODEL_ID_TO_GGML_NAME[modelId];
  if (!ggml) {
    throw new Error(`Unknown voice model id: ${modelId}`);
  }
  return `ggml-${ggml}.bin`;
}

export function ggmlUrlForVoiceModelId(modelId: VoiceModelId): string {
  return `${WHISPER_GGML_REPO_BASE}/${ggmlFileNameForVoiceModelId(modelId)}`;
}
