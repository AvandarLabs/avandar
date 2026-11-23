import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { waitFor } from "@/test-utils";
import type { LocalModelRuntime } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/createLocalModelRuntime";

const { runtime } = vi.hoisted(() => {
  return {
    runtime: {
      load: vi.fn(),
      complete: vi.fn(),
      unload: vi.fn(),
      deleteFromCache: vi.fn(),
    },
  };
});

vi.mock(
  "@/stores/OfflineChatEngineStore/createLocalModelRuntime/createLocalModelRuntime",
  () => {
    return {
      createLocalModelRuntime: (): LocalModelRuntime => {
        return runtime;
      },
    };
  },
);

import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";

const BUNDLE_IDS = LocalChatModel.getModelIdsFromBundle(
  LocalChatModel.OFFLINE_BUNDLE,
);
const ANSWER_ID = LocalChatModel.OFFLINE_BUNDLE.answer;

function _firstArgument(call: readonly unknown[]): unknown {
  return call[0];
}

function _request(modelId: string) {
  return {
    modelId,
    messages: [{ role: "user" as const, content: "hi" }],
    maxTokens: 16,
  };
}

describe("OfflineChatEngineStore", () => {
  beforeEach(() => {
    runtime.load.mockReset().mockResolvedValue(undefined);
    runtime.complete.mockReset().mockResolvedValue({
      text: "reply",
      promptTokens: 1,
      completionTokens: 1,
    });
    runtime.unload.mockReset().mockResolvedValue(undefined);
    runtime.deleteFromCache.mockReset().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await OfflineChatEngineStore.unload();
    window.localStorage.clear();
    JobProgressStore.getAllJobs().forEach(({ id }) => {
      JobProgressStore.finishJob(id);
    });
  });

  it("marks the bundle downloaded once every bundle model loads", async () => {
    await OfflineChatEngineStore.downloadBundle();

    expect(runtime.load.mock.calls.map(_firstArgument)).toEqual(BUNDLE_IDS);
    expect(LocalChatModelStore.isBundleDownloaded()).toBe(true);
  });

  it("frees GPU memory and closes its job once the download finishes", async () => {
    await OfflineChatEngineStore.downloadBundle();

    expect(runtime.unload).toHaveBeenCalled();
    expect(JobProgressStore.getAllJobs()).toHaveLength(0);
    expect(OfflineChatEngineStore.getStatus()).toEqual({ kind: "idle" });
  });

  it("reports the bundle download as one determinate job", async () => {
    let finishLoad!: () => void;
    runtime.load.mockImplementation((_id, onProgress) => {
      onProgress?.(0.5);
      return new Promise<void>((resolve) => {
        finishLoad = resolve;
      });
    });

    const download = OfflineChatEngineStore.downloadBundle();
    await waitFor(() => {
      expect(JobProgressStore.getAllJobs()).toHaveLength(1);
      expect(JobProgressStore.getAllJobs()[0]!.entry).toMatchObject({
        status: "determinate",
        current: Math.round(50 / BUNDLE_IDS.length),
        total: 100,
      });
    });
    expect(OfflineChatEngineStore.getStatus()).toMatchObject({
      kind: "downloading",
    });
    runtime.load.mockResolvedValue(undefined);
    finishLoad();
    await download;
  });

  it("fails the job and leaves the bundle missing when a download fails", async () => {
    runtime.load.mockRejectedValue(new Error("Download failed"));

    await expect(OfflineChatEngineStore.downloadBundle()).rejects.toThrow(
      "Download failed",
    );

    expect(LocalChatModelStore.isBundleDownloaded()).toBe(false);
    expect(JobProgressStore.getAllJobs()[0]!.entry).toMatchObject({
      status: "error",
      message: "Download failed",
    });
    expect(OfflineChatEngineStore.getStatus()).toEqual({
      kind: "error",
      message: "Download failed",
    });
  });

  it("loads a model once and reuses it for later requests", async () => {
    await OfflineChatEngineStore.complete(_request("model-a"));
    await OfflineChatEngineStore.complete(_request("model-a"));

    expect(runtime.load).toHaveBeenCalledTimes(1);
    expect(runtime.complete).toHaveBeenCalledTimes(2);
  });

  it("swaps the resident model when a request names another", async () => {
    await OfflineChatEngineStore.complete(_request("model-a"));
    await OfflineChatEngineStore.complete(_request("model-b"));

    expect(runtime.load.mock.calls.map(_firstArgument)).toEqual([
      "model-a",
      "model-b",
    ]);
  });

  it("runs requests one at a time", async () => {
    let finishFirst!: () => void;
    runtime.complete.mockImplementationOnce(() => {
      return new Promise((resolve) => {
        finishFirst = () => {
          resolve({ text: "first", promptTokens: 0, completionTokens: 0 });
        };
      });
    });

    const first = OfflineChatEngineStore.complete(_request("model-a"));
    const second = OfflineChatEngineStore.complete(_request("model-a"));
    await waitFor(() => {
      expect(runtime.complete).toHaveBeenCalledTimes(1);
    });
    finishFirst();
    await Promise.all([first, second]);

    expect(runtime.complete).toHaveBeenCalledTimes(2);
  });

  it("deletes every bundle model from the cache and clears its markers", async () => {
    BUNDLE_IDS.forEach(LocalChatModelStore.markDownloaded);

    await OfflineChatEngineStore.deleteBundle();

    expect(runtime.deleteFromCache.mock.calls.map(_firstArgument)).toEqual(
      BUNDLE_IDS,
    );
    expect(LocalChatModelStore.isBundleDownloaded()).toBe(false);
    expect(OfflineChatEngineStore.getStatus()).toEqual({ kind: "idle" });
  });

  it("answers the legacy engine's requests on the bundle's answer model", async () => {
    const engine = await OfflineChatEngineStore.ensureEngine();

    const text = await engine.complete({
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 16,
    });

    expect(text).toBe("reply");
    expect(runtime.complete).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: ANSWER_ID, maxTokens: 16 }),
    );
  });
});
