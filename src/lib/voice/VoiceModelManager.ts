import {
  clearCachedFilesForPrefix,
  createVoiceModelCache,
  hasCachedFilesForPrefix,
} from "./voiceModelCache";
import { findVoiceModel } from "./voiceModels";
import {
  clearVoiceModelDownloaded,
  isVoiceModelMarkedDownloaded,
  markVoiceModelDownloaded,
} from "./voiceModelStore";
import type {
  IVoiceModelManager,
  VoiceManagerStatus as SharedVoiceManagerStatus,
  VoiceManagerListener,
} from "./voiceManagerInterface";
import type { VoiceModelCache } from "./voiceModelCache";
import type {
  VoiceLanguageCode,
  VoiceModel,
  VoiceModelId,
} from "./voiceModels";

/**
 * Singleton orchestrator for the local voice-prompt feature.
 *
 * Responsibilities:
 * - Lazily configure `@huggingface/transformers` to use our IndexedDB cache
 *   (no OPFS, no browser HTTP cache).
 * - Track download progress for the active model and broadcast it to
 *   subscribers (used by the floating progress indicator + the mic button).
 * - Hold the loaded ASR pipeline in memory so subsequent transcriptions
 *   skip the cold-start cost.
 *
 * The class is exported as a singleton via `voiceModelManager`. Tests can
 * swap the `dependencies` to avoid actually loading transformers.js.
 */

/** Progress event emitted by `@huggingface/transformers` while loading. */
type TransformersProgressEvent = {
  status: "initiate" | "download" | "progress" | "done" | "ready";
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
  name?: string;
};

type ASRPipelineFn = (
  audio: Float32Array,
  options?: { language?: string; task?: string; chunk_length_s?: number },
) => Promise<{ text: string } | Array<{ text: string }>>;

type PipelineBuilderFn = (
  task: "automatic-speech-recognition",
  modelId: string,
  options: {
    progress_callback?: (event: TransformersProgressEvent) => void;
    dtype?: string | Record<string, string>;
  },
) => Promise<ASRPipelineFn>;

export type VoiceManagerStatus = SharedVoiceManagerStatus;

type Listener = VoiceManagerListener;

type ManagerDependencies = {
  /**
   * Loader that resolves to a `pipeline` function. Lazy so the
   * heavy ~10 MB transformers.js bundle is only pulled in once the user
   * actually triggers voice input.
   */
  loadPipeline: () => Promise<PipelineBuilderFn>;
  /**
   * Configures the singleton `env` object exposed by transformers.js.
   * Pulled in via the same dynamic import as `loadPipeline`.
   */
  configureEnv: (cache: VoiceModelCache) => Promise<void>;
};

const PRODUCTION_DEPENDENCIES: ManagerDependencies = {
  async loadPipeline() {
    const mod = await import("@huggingface/transformers");
    return mod.pipeline as unknown as PipelineBuilderFn;
  },
  async configureEnv(cache) {
    const mod = await import("@huggingface/transformers");
    mod.env.useBrowserCache = false;
    mod.env.useFSCache = false;
    mod.env.useCustomCache = true;
    // The CacheInterface accepts Response which is a superset of what we
    // return; the cast is safe because we return real Response objects.
    mod.env.customCache = cache as unknown as typeof mod.env.customCache;
    mod.env.allowLocalModels = false;
    mod.env.allowRemoteModels = true;
  },
};

export class VoiceModelManager implements IVoiceModelManager {
  private status: VoiceManagerStatus = { kind: "idle" };

  private readonly listeners = new Set<Listener>();

  private pipelinePromise: Promise<ASRPipelineFn> | null = null;

  private loadedModelId: VoiceModelId | null = null;

  private envConfigured = false;

  private readonly cache: VoiceModelCache;

  private readonly deps: ManagerDependencies;

  constructor(
    deps: ManagerDependencies = PRODUCTION_DEPENDENCIES,
    cache: VoiceModelCache = createVoiceModelCache(),
  ) {
    this.deps = deps;
    this.cache = cache;
  }

  /** Current status snapshot. */
  getStatus(): VoiceManagerStatus {
    return this.status;
  }

  /** Subscribe to status updates. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * True if the model has previously been downloaded successfully. Uses
   * both the localStorage flag (fast path) and the IndexedDB cache as a
   * fallback so the flag never lies if storage was cleared externally.
   */
  async isModelDownloaded(id: VoiceModelId): Promise<boolean> {
    if (!isVoiceModelMarkedDownloaded(id)) {
      return false;
    }
    const model = findVoiceModel(id);
    const inCache = await hasCachedFilesForPrefix(modelCachePrefix(model));
    if (!inCache) {
      // Stale flag — clear it so the UI re-prompts.
      clearVoiceModelDownloaded(id);
      return false;
    }
    return true;
  }

  /**
   * Loads (and, on first use, downloads) the given model. Safe to call
   * multiple times; if the model is already loaded, returns immediately.
   * Throws on failure (UI is responsible for surfacing the error toast).
   */
  async ensureModelLoaded(id: VoiceModelId): Promise<void> {
    if (
      this.loadedModelId === id &&
      this.pipelinePromise &&
      this.status.kind !== "error"
    ) {
      return;
    }

    await this.configureEnvOnce();
    const model = findVoiceModel(id);

    this.setStatus({
      kind: "downloading",
      modelId: id,
      progressPercent: -1,
    });

    const pipelineFn = await this.deps.loadPipeline();
    this.pipelinePromise = pipelineFn(
      "automatic-speech-recognition",
      model.hubRepo,
      {
        // The default wasm dtype (`q8`) loads the `*_quantized.onnx` Whisper
        // exports, which onnxruntime-web 1.26+ rejects because they're
        // missing the merged-scale tensors that the new MatMulNBits path
        // requires ("Missing required scale: ...weight_merged_0_scale").
        // Forcing fp32 sidesteps the quantized graph entirely. The download
        // is larger but still bounded to the small-tier models we expose on
        // web — see `voiceModels.ts` for the approxSizeMb values.
        dtype: "fp32",
        progress_callback: (event) => {
          this.handleProgress(id, event);
        },
      },
    );

    try {
      await this.pipelinePromise;
      this.loadedModelId = id;
      markVoiceModelDownloaded(id);
      this.setStatus({ kind: "ready", modelId: id });
    } catch (error) {
      this.pipelinePromise = null;
      this.loadedModelId = null;
      // Best-effort: clear any partial cache so retry isn't poisoned.
      await clearCachedFilesForPrefix(modelCachePrefix(model));
      this.setStatus({
        kind: "error",
        modelId: id,
        message:
          error instanceof Error ? error.message : "Failed to load voice model",
      });
      throw error;
    }
  }

  /**
   * Run transcription on Float32 PCM audio (16 kHz mono).
   */
  async transcribe(
    audio: Float32Array,
    options: { modelId: VoiceModelId; language?: VoiceLanguageCode } = {
      modelId: "whisper-tiny" as VoiceModelId,
    },
  ): Promise<string> {
    await this.ensureModelLoaded(options.modelId);
    if (!this.pipelinePromise) {
      throw new Error("Voice model pipeline is not initialised.");
    }
    const pipelineFn = await this.pipelinePromise;
    this.setStatus({ kind: "transcribing", modelId: options.modelId });
    try {
      const result = await pipelineFn(audio, {
        language:
          options.language && options.language !== "auto" ?
            options.language
          : undefined,
        task: "transcribe",
        chunk_length_s: 30,
      });
      const text =
        Array.isArray(result) ? (result[0]?.text ?? "") : result.text;
      this.setStatus({ kind: "ready", modelId: options.modelId });
      return text.trim();
    } catch (error) {
      this.setStatus({
        kind: "error",
        modelId: options.modelId,
        message:
          error instanceof Error ? error.message : "Transcription failed",
      });
      throw error;
    }
  }

  private async configureEnvOnce(): Promise<void> {
    if (this.envConfigured) {
      return;
    }
    await this.deps.configureEnv(this.cache);
    this.envConfigured = true;
  }

  private handleProgress(
    modelId: VoiceModelId,
    event: TransformersProgressEvent,
  ): void {
    // Only emit while we're in a downloading state — once we've flipped
    // to "ready" we don't want late progress events to overwrite it.
    if (this.status.kind !== "downloading" || this.status.modelId !== modelId) {
      return;
    }
    if (event.status === "progress") {
      const progressPercent =
        typeof event.progress === "number" ? Math.min(99, event.progress) : -1;
      this.setStatus({
        kind: "downloading",
        modelId,
        progressPercent,
        currentFile: event.file,
      });
    } else if (event.status === "done" || event.status === "ready") {
      this.setStatus({
        kind: "downloading",
        modelId,
        progressPercent: 99,
        currentFile: event.file,
      });
    }
  }

  private setStatus(next: VoiceManagerStatus): void {
    this.status = next;
    this.listeners.forEach((listener) => {
      listener(next);
    });
  }
}

function modelCachePrefix(model: VoiceModel): string {
  // Transformers.js stores files keyed by their full HF URL.
  return `https://huggingface.co/${model.hubRepo}/`;
}

let singleton: VoiceModelManager | null = null;

/**
 * Returns the process-wide manager singleton for the **web** runtime. The
 * platform-aware factory is `getVoiceModelManager` in
 * `voiceModelManagerFactory.ts`; use that from React code.
 */
export function getWebVoiceModelManager(): VoiceModelManager {
  if (!singleton) {
    singleton = new VoiceModelManager();
  }
  return singleton;
}

export const __TEST_ONLY = {
  reset: (): void => {
    singleton = null;
  },
  createManagerForTest: (
    deps: ManagerDependencies,
    cache: VoiceModelCache,
  ): VoiceModelManager => {
    return new VoiceModelManager(deps, cache);
  },
};
