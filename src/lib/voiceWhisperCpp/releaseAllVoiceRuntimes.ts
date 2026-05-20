import { getVoiceModelManager } from "@/lib/voice/voiceModelManagerFactory";
import { getWhisperCppVoiceModelManager } from "./whisperCppVoiceModelManagerFactory";

/**
 * Ensures at most one heavy voice runtime (transformers ONNX or whisper.cpp
 * WASM) is resident, and clears both before offline chat loads WebLLM.
 */
export async function releaseAllVoiceRuntimes(): Promise<void> {
  await Promise.all([
    getVoiceModelManager().releaseLoadedPipeline(),
    getWhisperCppVoiceModelManager().releaseLoadedPipeline(),
  ]);
}
