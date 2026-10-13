import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { afterEach, describe, expect, it } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { TaskProgressStore } from "@/lib/utils/state/TaskProgressStore/TaskProgressStore";
import { render, screen } from "@/test-utils";
import { OfflineChatDownloadIndicator } from "./OfflineChatDownloadIndicator";
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
  render(
    <I18nProvider i18n={i18n}>
      <AvandarAppProvider>
        <OfflineChatDownloadIndicator />
      </AvandarAppProvider>
    </I18nProvider>,
  );
}

describe("OfflineChatDownloadIndicator", () => {
  afterEach(() => {
    mockStatus = { kind: "idle" };
    TaskProgressStore.getAllTasks().forEach(({ id }) => {
      TaskProgressStore.finishTask(id);
    });
  });

  it("renders nothing itself", () => {
    mockStatus = {
      kind: "downloading",
      modelId: "qwen-1.5b",
      progress: 0.42,
    };
    // `AvandarAppProvider` (Mantine) always injects its own `<style>` tag
    // into the render container regardless of what's rendered inside it, so
    // the container itself is never literally empty. Assert instead that
    // the component's own former markup (its status panel) is gone.
    _renderBridge();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
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
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <AvandarAppProvider>
          <OfflineChatDownloadIndicator />
        </AvandarAppProvider>
      </I18nProvider>,
    );
    expect(TaskProgressStore.getAllTasks()).toHaveLength(1);

    mockStatus = { kind: "ready", modelId: "qwen-1.5b" };
    rerender(
      <I18nProvider i18n={i18n}>
        <AvandarAppProvider>
          <OfflineChatDownloadIndicator />
        </AvandarAppProvider>
      </I18nProvider>,
    );

    expect(TaskProgressStore.getAllTasks()).toHaveLength(0);
  });

  it("fails the task, leaving a dismissible error, when the engine errors", () => {
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
