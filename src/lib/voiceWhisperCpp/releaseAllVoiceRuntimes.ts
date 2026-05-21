import { getVoiceModelManager } from "@/lib/voice/voiceModelManagerFactory";

/**
 * Releases loaded voice inference runtimes so offline chat or the other
 * surface can reclaim memory.
 */
export async function releaseAllVoiceRuntimes(): Promise<void> {
  await getVoiceModelManager().releaseLoadedPipeline();
}
