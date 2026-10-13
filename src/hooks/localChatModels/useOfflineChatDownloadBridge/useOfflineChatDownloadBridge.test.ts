import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskProgressStore } from "@/lib/utils/state/TaskProgressStore/TaskProgressStore";
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
    TaskProgressStore.getAllTasks().forEach(({ id }) => {
      TaskProgressStore.finishTask(id);
    });
  });

  it("starts a determinate task reporting the download's progress", () => {
    mockStatus = {
      kind: "downloading",
      modelId: "qwen-1.5b",
      progress: 0.42,
    };
    _renderBridge();

    const tasks = TaskProgressStore.getAllTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.entry).toMatchObject({
      status: "determinate",
      current: 42,
      total: 100,
    });
  });

  it("finishes the task once the engine becomes ready", () => {
    mockStatus = { kind: "downloading", modelId: "qwen-1.5b", progress: 0.9 };
    const { rerender } = renderHook(
      () => {
        return useOfflineChatDownloadBridge();
      },
      { wrapper: TestProviders },
    );
    expect(TaskProgressStore.getAllTasks()).toHaveLength(1);

    mockStatus = { kind: "ready", modelId: "qwen-1.5b" };
    rerender();

    expect(TaskProgressStore.getAllTasks()).toHaveLength(0);
  });

  it("fails the task, keeping the error message, when the engine errors", () => {
    mockStatus = {
      kind: "error",
      modelId: "qwen-1.5b",
      message: "Download failed",
    };
    _renderBridge();

    const tasks = TaskProgressStore.getAllTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.entry).toMatchObject({
      status: "error",
      message: "Download failed",
    });
  });
});
