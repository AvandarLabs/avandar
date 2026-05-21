/*
 * Native Whisper service for the Bun-main process.
 *
 * Wraps `smart-whisper` (N-API bindings around whisper.cpp) so the desktop
 * shell can transcribe voice prompts locally without paying the
 * transformers.js / onnxruntime-web tax in the webview. Model weights
 * (.bin files in ggml format) are cached on disk under
 * `<userData>/whisper-models/`, so the user can download once and run
 * fully offline thereafter.
 *
 * Download flow uses a direct `fetch` against the public
 * `ggerganov/whisper.cpp` repo on Hugging Face rather than
 * `smart-whisper`'s built-in downloader. This is intentional:
 *   - We get streaming progress (Content-Length + ReadableStream) for free.
 *   - We pick the cache directory ourselves (smart-whisper's default lives
 *     under its own `node_modules` install root, which is the wrong place
 *     for user-managed model weights).
 *   - We don't depend on smart-whisper's downloader at all, so we can keep
 *     the public API of this service stable even if smart-whisper changes.
 *
 * The IPC handler layer (`apps/desktop/main/ipc/registerVoiceHandlers`) is
 * the sole consumer; the webview's `DesktopVoiceModelManager` then calls
 * those handlers through the typed contracts in
 * `shared/platform/ipc/contracts/VoiceContracts.ts`.
 *
 * Status reporting is intentionally pull-based — the service holds the
 * latest progress snapshot in memory and the webview polls it via
 * `voice.getStatus`. The existing IPC framework is request/reply only and
 * we don't want to grow a push channel just for this feature.
 */

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Public surface of the native Whisper service. Mirrors the IPC contracts
 * in `VoiceContracts.ts` so the handler layer is a thin pass-through.
 */
export type WhisperService = {
  listDownloadedModels(): readonly string[];
  isModelDownloaded(modelId: string): boolean;
  downloadModel(modelId: string): Promise<void>;
  deleteModel(modelId: string): Promise<void>;
  transcribe(args: {
    modelId: string;
    pcmSamples: Float32Array;
    language: string;
  }): Promise<string>;
  getStatus(): WhisperServiceStatus;
  close(): Promise<void>;
};

export type WhisperServiceStatus =
  | { kind: "idle" }
  | {
      kind: "downloading";
      modelId: string;
      progressPercent: number;
      currentFile?: string;
    }
  | { kind: "ready"; modelId: string }
  | { kind: "transcribing"; modelId: string }
  | { kind: "error"; modelId?: string; message: string };

/**
 * Maps our app-facing model ids (which match
 * `src/lib/voice/whisperCppVoiceModels.ts`) to ggml model names hosted under
 * `ggerganov/whisper.cpp` on Hugging Face. Kept in this file because the
 * service is the only place that needs the mapping — the IPC layer just
 * forwards opaque ids.
 */
export const WHISPER_MODEL_ID_TO_GGML_NAME: Readonly<Record<string, string>> = {
  "whisper-tiny": "tiny",
  "whisper-base": "base",
  "whisper-small": "small",
  "whisper-medium": "medium",
  "whisper-large-v3": "large-v3",
  "whisper-large-v3-turbo": "large-v3-turbo",
};

const GGML_REPO_BASE =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";

/**
 * Shape of the `smart-whisper` module we depend on. Kept as an injected
 * type so unit tests can stub it without resolving the native binding.
 */
export type SmartWhisperModule = {
  Whisper: new (
    modelPath: string,
    options?: { gpu?: boolean },
  ) => {
    transcribe: (
      pcm: Float32Array,
      options?: { language?: string },
    ) => Promise<{ result: Promise<Array<{ text: string }>> }>;
    free: () => Promise<void>;
  };
};

/**
 * Shape of the download dependency we use. Defaults to streaming `fetch`
 * with progress tracking; tests inject a stub that resolves immediately.
 */
export type DownloadDependency = (
  url: string,
  destPath: string,
  onProgress: (percent: number) => void,
) => Promise<void>;

export type CreateWhisperServiceOptions = {
  /** Directory where .bin model weights live. Created if missing. */
  modelsDir: string;
  /** Override for tests; defaults to a dynamic import of `smart-whisper`. */
  loadSmartWhisper?: () => Promise<SmartWhisperModule>;
  /** Override for tests; defaults to a streaming `fetch` download. */
  downloadFile?: DownloadDependency;
};

const DEFAULT_LOAD_SMART_WHISPER: () => Promise<SmartWhisperModule> =
  async () => {
    // Lazy import so a missing native binding at boot doesn't kill the app.
    // The voice feature degrades gracefully — the IPC handler surfaces the
    // load error to the webview which then shows a toast.
    const mod = (await import(
      /* @vite-ignore */ "smart-whisper"
    )) as unknown as SmartWhisperModule;
    return mod;
  };

/**
 * Streams `url` into `destPath`, reporting progress on every chunk. Writes
 * to a `.partial` file first and renames on success so a half-written
 * file can never be mistaken for a complete model.
 */
const DEFAULT_DOWNLOAD_FILE: DownloadDependency = async (
  url,
  destPath,
  onProgress,
) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Voice model download failed: ${response.status} ${response.statusText}`,
    );
  }
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (!response.body) {
    throw new Error("Voice model download returned an empty body");
  }

  const partialPath = `${destPath}.partial`;
  const fileStream = createWriteStream(partialPath);
  let received = 0;

  // Wrap the WebStream so we can observe bytes flowing through.
  const reportingStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        received += value.byteLength;
        if (contentLength > 0) {
          onProgress(Math.min(99, (received / contentLength) * 100));
        }
        controller.enqueue(value);
      }
      controller.close();
    },
  });

  // node:stream/promises#pipeline understands Node Readable; convert.
  await pipeline(Readable.fromWeb(reportingStream as never), fileStream);
  renameSync(partialPath, destPath);
};

/**
 * Opens (creating if needed) the on-disk whisper-models cache and returns a
 * {@link WhisperService} ready for IPC handlers to call.
 */
export function createWhisperService(
  options: CreateWhisperServiceOptions,
): WhisperService {
  mkdirSync(options.modelsDir, { recursive: true });

  const loadSmartWhisper =
    options.loadSmartWhisper ?? DEFAULT_LOAD_SMART_WHISPER;
  const downloadFile = options.downloadFile ?? DEFAULT_DOWNLOAD_FILE;

  let status: WhisperServiceStatus = { kind: "idle" };

  // Cached Whisper instance per modelId so back-to-back transcriptions
  // skip the model-load cost. Bounded at one because the models are large
  // and we don't want two ggml-large blobs resident at once.
  let activeWhisper: {
    modelId: string;
    instance: InstanceType<SmartWhisperModule["Whisper"]>;
  } | null = null;

  // Memoised module reference — fetched once on first call.
  let smartWhisperPromise: Promise<SmartWhisperModule> | null = null;
  const getSmartWhisper = async (): Promise<SmartWhisperModule> => {
    if (!smartWhisperPromise) {
      smartWhisperPromise = loadSmartWhisper();
    }
    return smartWhisperPromise;
  };

  const fileNameForModel = (modelId: string): string => {
    const ggml = WHISPER_MODEL_ID_TO_GGML_NAME[modelId];
    if (!ggml) {
      throw new Error(`Unknown voice model id: ${modelId}`);
    }
    return `ggml-${ggml}.bin`;
  };

  const fullPathForModel = (modelId: string): string => {
    return join(options.modelsDir, fileNameForModel(modelId));
  };

  const isModelDownloaded = (modelId: string): boolean => {
    if (!WHISPER_MODEL_ID_TO_GGML_NAME[modelId]) {
      return false;
    }
    const fullPath = fullPathForModel(modelId);
    return existsSync(fullPath) && statSync(fullPath).size > 0;
  };

  const listDownloadedModels = (): readonly string[] => {
    if (!existsSync(options.modelsDir)) {
      return [];
    }
    const files = readdirSync(options.modelsDir);
    const downloaded: string[] = [];
    for (const [appId, ggml] of Object.entries(WHISPER_MODEL_ID_TO_GGML_NAME)) {
      if (files.includes(`ggml-${ggml}.bin`)) {
        downloaded.push(appId);
      }
    }
    return downloaded;
  };

  const deleteModel = async (modelId: string): Promise<void> => {
    const ggmlName = WHISPER_MODEL_ID_TO_GGML_NAME[modelId];
    if (!ggmlName) {
      throw new Error(`Unknown voice model id: ${modelId}`);
    }

    if (activeWhisper?.modelId === modelId) {
      await activeWhisper.instance.free().catch(() => {
        return undefined;
      });
      activeWhisper = null;
    }

    const destPath = fullPathForModel(modelId);
    await unlink(destPath).catch(() => {
      return undefined;
    });
    await unlink(`${destPath}.partial`).catch(() => {
      return undefined;
    });

    if (
      status.kind !== "idle" &&
      ("modelId" in status ? status.modelId === modelId : false)
    ) {
      status = { kind: "idle" };
    }
  };

  const downloadModel = async (modelId: string): Promise<void> => {
    const ggmlName = WHISPER_MODEL_ID_TO_GGML_NAME[modelId];
    if (!ggmlName) {
      const message = `Unknown voice model id: ${modelId}`;
      status = { kind: "error", modelId, message };
      throw new Error(message);
    }

    if (isModelDownloaded(modelId)) {
      status = { kind: "ready", modelId };
      return;
    }

    const fileName = fileNameForModel(modelId);
    const destPath = fullPathForModel(modelId);
    const url = `${GGML_REPO_BASE}/ggml-${ggmlName}.bin`;

    status = {
      kind: "downloading",
      modelId,
      progressPercent: -1,
      currentFile: fileName,
    };

    try {
      await downloadFile(url, destPath, (percent) => {
        status = {
          kind: "downloading",
          modelId,
          progressPercent: Math.max(0, Math.min(99, percent)),
          currentFile: fileName,
        };
      });
      status = { kind: "ready", modelId };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Voice model download failed";
      status = { kind: "error", modelId, message };
      // Best-effort: clear any partial files so a retry isn't poisoned.
      await unlink(destPath).catch(() => {
        return undefined;
      });
      await unlink(`${destPath}.partial`).catch(() => {
        return undefined;
      });
      throw err;
    }
  };

  const ensureWhisperInstanceLoaded = async (
    modelId: string,
  ): Promise<InstanceType<SmartWhisperModule["Whisper"]>> => {
    if (activeWhisper && activeWhisper.modelId === modelId) {
      return activeWhisper.instance;
    }
    if (activeWhisper) {
      await activeWhisper.instance.free().catch(() => {
        return undefined;
      });
      activeWhisper = null;
    }
    if (!isModelDownloaded(modelId)) {
      throw new Error(`Voice model ${modelId} has not been downloaded yet`);
    }
    const sw = await getSmartWhisper();
    const instance = new sw.Whisper(fullPathForModel(modelId), { gpu: false });
    activeWhisper = { modelId, instance };
    return instance;
  };

  const transcribe: WhisperService["transcribe"] = async ({
    modelId,
    pcmSamples,
    language,
  }) => {
    status = { kind: "transcribing", modelId };
    try {
      const whisper = await ensureWhisperInstanceLoaded(modelId);
      const task = await whisper.transcribe(pcmSamples, {
        language,
      });
      const segments = await task.result;
      const text = segments
        .map((segment) => {
          return segment.text;
        })
        .join("")
        .trim();
      status = { kind: "ready", modelId };
      return text;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Voice transcription failed";
      status = { kind: "error", modelId, message };
      throw err;
    }
  };

  return {
    listDownloadedModels,
    isModelDownloaded,
    downloadModel,
    deleteModel,
    transcribe,
    getStatus(): WhisperServiceStatus {
      return status;
    },
    async close() {
      if (activeWhisper) {
        await activeWhisper.instance.free().catch(() => {
          return undefined;
        });
        activeWhisper = null;
      }
    },
  };
}
