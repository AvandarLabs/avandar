import { WHISPER_CPP_VOICE_MODELS } from "./whisperCppVoiceModels";
import type { WhisperCppVoiceModelId } from "./whisperCppVoiceModels";

/**
 * Barrel for voice dictation shared types. Model catalog lives in
 * `whisperCppVoiceModels.ts`; languages in `voiceLanguages.ts`.
 */

export type { VoiceLanguageCode, VoiceLanguageOption } from "./voiceLanguages";
export { VOICE_LANGUAGES, voiceLanguageForLocale } from "./voiceLanguages";

export type {
  WhisperCppVoiceModel,
  WhisperCppVoiceModelId,
} from "./whisperCppVoiceModels";
export {
  DEFAULT_WHISPER_CPP_VOICE_MODEL_ID,
  findWhisperCppVoiceModel,
  isWhisperCppModelAvailableOnPlatform,
  isWhisperCppVoiceModelId,
  listWhisperCppModelsForPlatform,
  listWhisperCppVoiceModelsSorted,
  whisperCppApproxDownloadSizeMb,
  WHISPER_CPP_VOICE_MODELS,
} from "./whisperCppVoiceModels";

/** Default voice model id in storage and IPC. */
export { DEFAULT_WHISPER_CPP_VOICE_MODEL_ID as DEFAULT_VOICE_MODEL_ID } from "./whisperCppVoiceModels";

export type VoiceModelId = WhisperCppVoiceModelId;

const VOICE_MODEL_ID_SET = new Set<string>(
  WHISPER_CPP_VOICE_MODELS.map((model) => {
    return model.id;
  }),
);

/** Type guard for catalog ids (storage, UI selection). */
export function isVoiceModelId(id: string): id is VoiceModelId {
  return VOICE_MODEL_ID_SET.has(id);
}
