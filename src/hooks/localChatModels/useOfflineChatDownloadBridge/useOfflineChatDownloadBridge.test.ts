import { afterEach, describe, expect, it, vi } from "vitest";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { renderHook, TestProviders } from "@/test-utils";
import { useOfflineChatDownloadBridge } from "./useOfflineChatDownloadBridge";
import type { OfflineChatManagerStatus } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";

let mockStatus: OfflineChatManagerStatus = { kind: "idle" };

vi.mock("@/hooks/localChatModels/useOfflineChatEngineStatus", () => {
  return {
    useOfflineChatEngineStatus: () => {
      return mockStatus;
    },
  };
});

function _renderBridge(): void {
  renderHook(
    () => {
      return useOfflineChatDownloadBridge();
    },
    { wrapper: TestProviders },
  );
}

describe("useOfflineChatDownloadBridge", () => {
  afterEach(() => {
    mockStatus = { kind: "idle" };
    JobProgressStore.getAllJobs().forEach(({ id }) => {
      JobProgressStore.finishJob(id);
    });
  });

  it("starts a determinate job reporting the download's progress", () => {
    mockStatus = {
      kind: "downloading",
      modelId: "qwen-1.5b",
      progress: 0.42,
    };
    _renderBridge();

    const jobs = JobProgressStore.getAllJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.entry).toMatchObject({
      status: "determinate",
      current: 42,
      total: 100,
    });
  });

  it("finishes the job once the engine becomes ready", () => {
    mockStatus = { kind: "downloading", modelId: "qwen-1.5b", progress: 0.9 };
    const { rerender } = renderHook(
      () => {
        return useOfflineChatDownloadBridge();
      },
      { wrapper: TestProviders },
    );
    expect(JobProgressStore.getAllJobs()).toHaveLength(1);

    mockStatus = { kind: "ready", modelId: "qwen-1.5b" };
    rerender();

    expect(JobProgressStore.getAllJobs()).toHaveLength(0);
  });

  it("fails the job, keeping the error message, when the engine errors", () => {
    mockStatus = {
      kind: "error",
      modelId: "qwen-1.5b",
      message: "Download failed",
    };
    _renderBridge();

    const jobs = JobProgressStore.getAllJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.entry).toMatchObject({
      status: "error",
      message: "Download failed",
    });
  });
});
