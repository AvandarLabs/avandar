import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __TEST_ONLY } from "./VoiceModelManager";
import type { VoiceModelCache } from "./voiceModelCache";

type ProgressEvent = {
  status: string;
  progress?: number;
  file?: string;
};

type InMemoryCache = VoiceModelCache & {
  entries: Map<string, ArrayBuffer>;
};

function createInMemoryCache(): InMemoryCache {
  const entries = new Map<string, ArrayBuffer>();
  return {
    entries,
    async match(request) {
      const body = entries.get(request);
      if (!body) {
        return undefined;
      }
      return new Response(body);
    },
    async put(request, response) {
      const body = await response.clone().arrayBuffer();
      entries.set(request, body);
    },
    async delete(request) {
      return entries.delete(request);
    },
  };
}

describe("VoiceModelManager", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    __TEST_ONLY.reset();
  });

  it("downloads a model and reaches the ready state, emitting progress", async () => {
    const cache = createInMemoryCache();

    let capturedProgressCb: ((event: ProgressEvent) => void) | undefined;
    const pipelineFn = vi.fn().mockResolvedValue({ text: "hello world" });
    const buildPipeline = vi
      .fn()
      .mockImplementation(async (_task, _modelId, options) => {
        capturedProgressCb = options.progress_callback;
        return pipelineFn;
      });

    const configureEnv = vi.fn().mockResolvedValue(undefined);

    const manager = __TEST_ONLY.createManagerForTest(
      {
        loadPipeline: async () => {
          return buildPipeline;
        },
        configureEnv,
      },
      cache,
    );

    const statuses: string[] = [];
    manager.subscribe((s) => {
      statuses.push(s.kind);
    });

    const ensure = manager.ensureModelLoaded("whisper-tiny");

    // Simulate progress events arriving while we wait
    await Promise.resolve();
    capturedProgressCb?.({
      status: "progress",
      progress: 42,
      file: "model.onnx",
    });

    await ensure;

    expect(configureEnv).toHaveBeenCalledTimes(1);
    expect(buildPipeline).toHaveBeenCalledWith(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny",
      expect.objectContaining({ progress_callback: expect.any(Function) }),
    );

    const finalStatus = manager.getStatus();
    expect(finalStatus.kind).toBe("ready");
    expect(statuses).toContain("downloading");
    expect(statuses[statuses.length - 1]).toBe("ready");
  });

  it("transcribes audio using the loaded pipeline and returns the trimmed text", async () => {
    const cache = createInMemoryCache();
    const pipelineFn = vi.fn().mockResolvedValue({ text: "  Hola mundo  " });
    const buildPipeline = vi.fn().mockResolvedValue(pipelineFn);

    const manager = __TEST_ONLY.createManagerForTest(
      {
        loadPipeline: async () => {
          return buildPipeline;
        },
        configureEnv: async () => {
          return undefined;
        },
      },
      cache,
    );

    const audio = new Float32Array([0, 0.1, -0.1, 0]);
    const text = await manager.transcribe(audio, {
      modelId: "whisper-tiny",
      language: "spanish",
    });

    expect(text).toBe("Hola mundo");
    expect(pipelineFn).toHaveBeenCalledWith(
      audio,
      expect.objectContaining({ language: "spanish", task: "transcribe" }),
    );
  });

  it("does not pass `language: auto` to the pipeline (uses Whisper auto-detect)", async () => {
    const cache = createInMemoryCache();
    const pipelineFn = vi.fn().mockResolvedValue({ text: "result" });
    const buildPipeline = vi.fn().mockResolvedValue(pipelineFn);

    const manager = __TEST_ONLY.createManagerForTest(
      {
        loadPipeline: async () => {
          return buildPipeline;
        },
        configureEnv: async () => {
          return undefined;
        },
      },
      cache,
    );

    await manager.transcribe(new Float32Array([0]), {
      modelId: "whisper-tiny",
      language: "auto",
    });

    const callOptions = pipelineFn.mock.calls[0]?.[1] as
      | { language?: string }
      | undefined;
    expect(callOptions?.language).toBeUndefined();
  });

  it("transitions to error state and clears stored marker when download fails", async () => {
    const cache = createInMemoryCache();
    const downloadError = new Error("network down");
    const buildPipeline = vi.fn().mockRejectedValue(downloadError);

    const manager = __TEST_ONLY.createManagerForTest(
      {
        loadPipeline: async () => {
          return buildPipeline;
        },
        configureEnv: async () => {
          return undefined;
        },
      },
      cache,
    );

    await expect(manager.ensureModelLoaded("whisper-tiny")).rejects.toBe(
      downloadError,
    );
    expect(manager.getStatus()).toMatchObject({
      kind: "error",
      message: "network down",
    });
    expect(
      window.localStorage.getItem("avandar.voice.downloadedModels"),
    ).toBeNull();
  });

  it("isModelDownloaded returns false when the cache lacks files even if marker says yes", async () => {
    const cache = createInMemoryCache();
    // Pre-mark the model as downloaded.
    window.localStorage.setItem(
      "avandar.voice.downloadedModels",
      JSON.stringify({ "whisper-tiny": true }),
    );

    const manager = __TEST_ONLY.createManagerForTest(
      {
        loadPipeline: async () => {
          return vi.fn();
        },
        configureEnv: async () => {
          return undefined;
        },
      },
      cache,
    );

    // The Dexie-backed `hasCachedFilesForPrefix` is unaware of our in-memory
    // cache, so it returns false → the manager should clear the stale marker.
    const result = await manager.isModelDownloaded("whisper-tiny");
    expect(result).toBe(false);
    expect(window.localStorage.getItem("avandar.voice.downloadedModels")).toBe(
      "{}",
    );
  });
});
