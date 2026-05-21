/**
 * Main-thread whisper.cpp WASM runtime. Emscripten pthread builds spawn
 * `em-pthread` workers from `mainScriptUrlOrBlob`; that breaks inside a nested
 * dedicated worker, so inference runs on the main thread (model bytes still
 * stream into IndexedDB off-thread during download).
 */

import { WhisperWasmService } from "@timur00kh/whisper.wasm";
import {
  freeWhisperWasmModule,
  patchWhisperWasmLoader,
  resetWhisperTranscribingFlag,
} from "./patchWhisperWasmLoader";
import { resolveWhisperCppThreadCount } from "./resolveWhisperCppThreadCount";
import { assertValidGgmlModelBytes } from "./validateGgmlModelBytes";
import { voiceLanguageToWhisperCode } from "./voiceLanguageToWhisperCode";
import type { VoiceLanguageCode, VoiceModelId } from "@/lib/voice/voiceModels";

/** Whisper expects 16 kHz mono PCM; require at least half a second. */
const MIN_AUDIO_SAMPLES = 16_000 / 2;

const TRANSCRIBE_TIMEOUT_MS = 90_000;

let whisper: WhisperWasmService | null = null;
let loadedModelId: VoiceModelId | null = null;

function formatWhisperRuntimeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("Aborted")) {
      return (
        "Whisper.cpp ran out of WASM memory while starting (often with DuckDB " +
        "open). Refresh the page, avoid large datasets, or use the other " +
        "microphone button."
      );
    }
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    const serialized = JSON.stringify(error);
    if (serialized.includes("Aborted")) {
      return (
        "Whisper.cpp ran out of WASM memory while starting. Refresh and try " +
        "again, or use the other microphone button."
      );
    }
    return serialized;
  } catch {
    return "Whisper.cpp failed";
  }
}

function assertWhisperCppEnvironment(): void {
  if (typeof crossOriginIsolated === "boolean" && !crossOriginIsolated) {
    throw new Error(
      "Whisper.cpp requires a cross-origin isolated page (SharedArrayBuffer). " +
        "Restart the dev server and hard-refresh, or use the other microphone.",
    );
  }
}

async function ensureWhisper(): Promise<WhisperWasmService> {
  patchWhisperWasmLoader();
  if (!whisper) {
    whisper = new WhisperWasmService({ logLevel: 0, init: false });
    const supported = await whisper.checkWasmSupport();
    if (!supported) {
      throw new Error("WebAssembly is not supported in this browser.");
    }
  }
  return whisper;
}

/** Loads ggml weights into the WASM heap when not already loaded. */
export async function loadWhisperCppModelBytes(
  modelId: VoiceModelId,
  modelBytes: Uint8Array,
  fileName: string,
): Promise<void> {
  assertWhisperCppEnvironment();

  const modelBuffer = modelBytes.buffer.slice(
    modelBytes.byteOffset,
    modelBytes.byteOffset + modelBytes.byteLength,
  ) as ArrayBuffer;
  assertValidGgmlModelBytes(modelBuffer, fileName);

  const service = await ensureWhisper();
  if (loadedModelId === modelId) {
    return;
  }

  try {
    await service.initModel(modelBytes);
  } catch (error) {
    throw new Error(
      `${formatWhisperRuntimeError(error)}. Try refreshing the page or use the other microphone button.`,
    );
  }
  loadedModelId = modelId;
}

async function runTranscription(
  audio: Float32Array,
  language: VoiceLanguageCode,
): Promise<string> {
  if (!loadedModelId || !whisper) {
    throw new Error("Whisper.cpp model is not loaded.");
  }

  resetWhisperTranscribingFlag(whisper);

  try {
    const whisperLanguage = voiceLanguageToWhisperCode(language);
    const { segments } = await whisper.transcribe(audio, undefined, {
      language: whisperLanguage,
      threads: resolveWhisperCppThreadCount(),
      translate: false,
    });

    return segments
      .map((segment) => {
        return segment.text.trim();
      })
      .filter((text) => {
        return text.length > 0;
      })
      .join(" ")
      .trim();
  } finally {
    resetWhisperTranscribingFlag(whisper);
  }
}

export async function transcribeWithWhisperCpp(
  audio: Float32Array,
  language: VoiceLanguageCode,
): Promise<string> {
  if (audio.length < MIN_AUDIO_SAMPLES) {
    throw new Error(
      "Recording is too short. Hold the mic for at least half a second.",
    );
  }

  const timeoutMs = TRANSCRIBE_TIMEOUT_MS + 15_000;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      runTranscription(audio, language),
      new Promise<string>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              "Transcription timed out. Refresh the page and try again.",
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    const detail = formatWhisperRuntimeError(error);
    throw new Error(detail);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export async function releaseWhisperCppRuntime(): Promise<void> {
  if (whisper) {
    freeWhisperWasmModule(whisper);
    whisper = null;
  }
  loadedModelId = null;
}

export const __TEST_ONLY = {
  getLoadedModelId: (): VoiceModelId | null => {
    return loadedModelId;
  },
  resetRuntimeForTests(): void {
    whisper = null;
    loadedModelId = null;
  },
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void releaseWhisperCppRuntime();
  });
}
