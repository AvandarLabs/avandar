/**
 * Web Worker that owns the whisper.cpp WASM runtime. Keeps inference off the
 * main thread so the Data Explorer canvas stays interactive.
 */

import { ModelManager, WhisperWasmService } from "@timur00kh/whisper.wasm";
import { voiceLanguageToWhisperCode } from "./voiceLanguageToWhisperCode";
import type { VoiceLanguageCode } from "@/lib/voice/voiceModels";

export type WhisperCppWorkerRequest =
  | { id: string; type: "loadModel"; modelUrl: string }
  | {
      id: string;
      type: "transcribe";
      audio: Float32Array;
      language: VoiceLanguageCode;
    }
  | { id: string; type: "release" }
  | { id: string; type: "clearModelCache" };

export type WhisperCppWorkerResponse =
  | {
      id: string;
      type: "progress";
      fileName: string;
      progressPercent: number;
    }
  | { id: string; type: "success"; result?: string }
  | { id: string; type: "error"; message: string };

let whisper: WhisperWasmService | null = null;
let modelManager: ModelManager | null = null;
let loadedModelUrl: string | null = null;

async function ensureServices(): Promise<{
  whisper: WhisperWasmService;
  modelManager: ModelManager;
}> {
  if (!whisper) {
    whisper = new WhisperWasmService({ logLevel: 0, init: false });
    const supported = await whisper.checkWasmSupport();
    if (!supported) {
      throw new Error("WebAssembly is not supported in this browser.");
    }
    await whisper.loadWasmScript();
  }
  if (!modelManager) {
    modelManager = new ModelManager({ logLevel: 0 });
  }
  return { whisper, modelManager };
}

async function handleLoadModel(
  id: string,
  modelUrl: string,
): Promise<WhisperCppWorkerResponse> {
  const { whisper: service, modelManager: models } = await ensureServices();
  if (loadedModelUrl === modelUrl) {
    return { id, type: "success" };
  }

  if (loadedModelUrl) {
    await service.restartModel().catch(() => {
      return undefined;
    });
    loadedModelUrl = null;
  }

  const modelData = await models.loadModelByUrl(modelUrl, (progress) => {
    const event: WhisperCppWorkerResponse = {
      id,
      type: "progress",
      fileName: modelUrl.split("/").pop() ?? "ggml model",
      progressPercent: Math.max(0, Math.min(99, progress)),
    };
    self.postMessage(event);
  });

  await service.initModel(modelData);
  loadedModelUrl = modelUrl;
  return { id, type: "success" };
}

async function handleTranscribe(
  id: string,
  audio: Float32Array,
  language: VoiceLanguageCode,
): Promise<WhisperCppWorkerResponse> {
  if (!loadedModelUrl || !whisper) {
    throw new Error("Whisper.cpp model is not loaded.");
  }
  const whisperLanguage = voiceLanguageToWhisperCode(language);
  const { segments } = await whisper.transcribe(audio, undefined, {
    language: whisperLanguage,
    threads: 1,
    translate: false,
  });
  const text = segments
    .map((segment) => {
      return segment.text;
    })
    .join("")
    .trim();
  return { id, type: "success", result: text };
}

async function handleRelease(id: string): Promise<WhisperCppWorkerResponse> {
  if (whisper) {
    await whisper.restartModel().catch(() => {
      return undefined;
    });
  }
  loadedModelUrl = null;
  return { id, type: "success" };
}

async function handleClearCache(id: string): Promise<WhisperCppWorkerResponse> {
  const { modelManager: models } = await ensureServices();
  await models.clearCache();
  return { id, type: "success" };
}

self.addEventListener(
  "message",
  (event: MessageEvent<WhisperCppWorkerRequest>) => {
    const request = event.data;
    void (async () => {
      try {
        let response: WhisperCppWorkerResponse;
        switch (request.type) {
          case "loadModel":
            response = await handleLoadModel(request.id, request.modelUrl);
            break;
          case "transcribe": {
            response = await handleTranscribe(
              request.id,
              request.audio,
              request.language,
            );
            break;
          }
          case "release":
            response = await handleRelease(request.id);
            break;
          case "clearModelCache":
            response = await handleClearCache(request.id);
            break;
          default: {
            const unknownType = (request as { type: string }).type;
            throw new Error(`Unknown worker request: ${unknownType}`);
          }
        }
        self.postMessage(response);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Whisper worker failed";
        const response: WhisperCppWorkerResponse = {
          id: request.id,
          type: "error",
          message,
        };
        self.postMessage(response);
      }
    })();
  },
);
