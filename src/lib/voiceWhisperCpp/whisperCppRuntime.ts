/**
 * Main-thread whisper.cpp WASM runtime (`threads: 1`). Model bytes download via
 * fetch/IndexedDB; inference runs here, not in a dedicated web worker.
 */

import { WhisperWasmService } from "@timur00kh/whisper.wasm";
import {
  assertWhisperCppCanRun,
  isWhisperCppCrossOriginIsolated,
} from "./assertWhisperCppCanRun";
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
  const isAborted =
    (error instanceof Error && error.message.includes("Aborted")) ||
    (typeof error === "string" && error.includes("Aborted")) ||
    (() => {
      try {
        return JSON.stringify(error).includes("Aborted");
      } catch {
        return false;
      }
    })();

  if (isAborted && !isWhisperCppCrossOriginIsolated()) {
    return (
      "Whisper.cpp could not start: this build needs SharedArrayBuffer (COOP + " +
      "COEP on the app). Re-enable those headers for browser dictation, or use " +
      "Avandar Desktop."
    );
  }

  if (isAborted) {
    return (
      "Whisper.cpp ran out of WASM memory (often because DuckDB-WASM is still " +
      "loaded). Try again after a refresh, or close dataset import / heavy queries " +
      "first."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Whisper.cpp failed";
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
  assertWhisperCppCanRun();

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
  assertWhisperCppCanRun();

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
