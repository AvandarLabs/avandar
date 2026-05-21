import { findWhisperCppVoiceModel } from "@/lib/voice/whisperCppVoiceModels";
import type { WhisperCppVoiceModelId } from "@/lib/voice/whisperCppVoiceModels";

/** Same Hugging Face repo as desktop `createWhisperService`. */
export const WHISPER_GGML_REPO_BASE =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";

export function ggmlFileNameForVoiceModelId(
  modelId: WhisperCppVoiceModelId,
  platform: "web" | "desktop" = "web",
): string {
  const model = findWhisperCppVoiceModel(modelId);
  if (platform === "web") {
    const stem = model.webGgmlQuantStem;
    if (!stem) {
      throw new Error(
        `Voice model ${modelId} is not available for whisper.cpp on web`,
      );
    }
    return `ggml-${stem}.bin`;
  }
  return `ggml-${model.desktopGgmlStem}.bin`;
}

export function ggmlUrlForVoiceModelId(
  modelId: WhisperCppVoiceModelId,
  platform: "web" | "desktop" = "web",
): string {
  return `${WHISPER_GGML_REPO_BASE}/${ggmlFileNameForVoiceModelId(modelId, platform)}`;
}
