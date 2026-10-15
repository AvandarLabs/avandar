import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { waitFor } from "@/test-utils";
import type { OfflineChatEngine } from "$/types/offlineChat.types";

const { createOfflineChatEngineMock, deleteLocalChatModelCacheMock } =
  vi.hoisted(() => {
    return {
      createOfflineChatEngineMock: vi.fn(),
      deleteLocalChatModelCacheMock: vi.fn().mockResolvedValue(undefined),
    };
  });

vi.mock(
  "@/stores/OfflineChatEngineStore/createOfflineChatEngine/createOfflineChatEngine",
  () => {
    return { createOfflineChatEngine: createOfflineChatEngineMock };
  },
);

vi.mock(
  "@/stores/OfflineChatEngineStore/deleteLocalChatModelCache/deleteLocalChatModelCache",
  () => {
    return { deleteLocalChatModelCache: deleteLocalChatModelCacheMock };
  },
);

import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";

function _makeControllableEngine(): {
  engine: OfflineChatEngine;
  resolvePreload: () => void;
  rejectPreload: (error: Error) => void;
} {
  let resolvePreload!: () => void;
  let rejectPreload!: (error: Error) => void;
  const preloadPromise = new Promise<void>((resolve, reject) => {
    resolvePreload = resolve;
    rejectPreload = reject;
  });
  return {
    engine: {
      preload: () => {
        return preloadPromise;
      },
      complete: vi.fn(),
      unload: vi.fn().mockResolvedValue(undefined),
    },
    resolvePreload,
    rejectPreload,
  };
}

describe("OfflineChatEngineStore", () => {
  beforeEach(() => {
    createOfflineChatEngineMock.mockReset();
    deleteLocalChatModelCacheMock.mockClear();
    window.localStorage.clear();
  });

  afterEach(async () => {
    await OfflineChatEngineStore.unload();
    window.localStorage.clear();
    JobProgressStore.getAllJobs().forEach(({ id }) => {
      JobProgressStore.finishJob(id);
    });
  });

  it("starts a determinate job reporting the download's progress", async () => {
    const { engine } = _makeControllableEngine();
    createOfflineChatEngineMock.mockImplementation(
      ({ onDownloadProgress }) => {
        onDownloadProgress?.({ text: "", progress: 0.42 });
        return engine;
      },
    );

    void OfflineChatEngineStore.ensureEngine("qwen-1.5b");

    await waitFor(() => {
      expect(JobProgressStore.getAllJobs()).toHaveLength(1);
    });
    const jobs = JobProgressStore.getAllJobs();
    expect(jobs[0]!.entry).toMatchObject({
      status: "determinate",
      current: 42,
      total: 100,
    });
  });

  it("finishes the job once the engine becomes ready", async () => {
    const { engine, resolvePreload } = _makeControllableEngine();
    createOfflineChatEngineMock.mockReturnValue(engine);

    const enginePromise = OfflineChatEngineStore.ensureEngine("qwen-1.5b");
    await waitFor(() => {
      expect(JobProgressStore.getAllJobs()).toHaveLength(1);
    });

    resolvePreload();
    await enginePromise;

    expect(JobProgressStore.getAllJobs()).toHaveLength(0);
  });

  it("fails the job, keeping the error message, when the engine errors", async () => {
    const { engine, rejectPreload } = _makeControllableEngine();
    createOfflineChatEngineMock.mockReturnValue(engine);

    const enginePromise = OfflineChatEngineStore.ensureEngine("qwen-1.5b");
    await waitFor(() => {
      expect(JobProgressStore.getAllJobs()).toHaveLength(1);
    });

    rejectPreload(new Error("Download failed"));
    await expect(enginePromise).rejects.toThrow("Download failed");

    const jobs = JobProgressStore.getAllJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.entry).toMatchObject({
      status: "error",
      message: "Download failed",
    });
  });

  it("finishes an in-flight download job when unload() interrupts it", async () => {
    const { engine } = _makeControllableEngine();
    createOfflineChatEngineMock.mockReturnValue(engine);

    void OfflineChatEngineStore.ensureEngine("qwen-1.5b");
    await waitFor(() => {
      expect(JobProgressStore.getAllJobs()).toHaveLength(1);
    });

    await OfflineChatEngineStore.unload();

    expect(JobProgressStore.getAllJobs()).toHaveLength(0);
  });
});
