import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { OfflineModeStore } from "@/stores/OfflineModeStore/OfflineModeStore";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import { OfflineModeControl } from "./OfflineModeControl";
import type { OfflineChatEngineStatus } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";

const { engineStore } = vi.hoisted(() => {
  return {
    engineStore: {
      status: { kind: "idle" } as OfflineChatEngineStatus,
      listeners: new Set<(status: OfflineChatEngineStatus) => void>(),
      downloadBundle: vi.fn(),
      deleteBundle: vi.fn(),
    },
  };
});

vi.mock("@/stores/OfflineChatEngineStore/OfflineChatEngineStore", () => {
  return {
    OfflineChatEngineStore: {
      subscribe: (listener: (status: OfflineChatEngineStatus) => void) => {
        engineStore.listeners.add(listener);
        return () => {
          engineStore.listeners.delete(listener);
        };
      },
      getStatus: () => {
        return engineStore.status;
      },
      downloadBundle: engineStore.downloadBundle,
      deleteBundle: engineStore.deleteBundle,
    },
  };
});

function _setEngineStatus(status: OfflineChatEngineStatus): void {
  act(() => {
    engineStore.status = status;
    engineStore.listeners.forEach((listener) => {
      listener(status);
    });
  });
}

function _markBundleDownloaded(): void {
  LocalChatModel.getModelIdsFromBundle(LocalChatModel.OFFLINE_BUNDLE).forEach(
    LocalChatModelStore.markDownloaded,
  );
}

function _setWebGpu(isAvailable: boolean): void {
  if (isAvailable) {
    Object.defineProperty(navigator, "gpu", { value: {}, configurable: true });
  } else {
    Reflect.deleteProperty(navigator, "gpu");
  }
}

describe("OfflineModeControl", () => {
  beforeEach(() => {
    engineStore.status = { kind: "idle" };
    engineStore.downloadBundle.mockReset().mockResolvedValue(undefined);
    engineStore.deleteBundle.mockReset().mockResolvedValue(undefined);
    _setWebGpu(true);
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    _setWebGpu(false);
  });

  it("downloads the offline models from the dialog when none are downloaded", async () => {
    render(<OfflineModeControl />);

    fireEvent.click(screen.getByRole("button", { name: "Offline mode" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Download offline models" }),
    );

    await waitFor(() => {
      expect(engineStore.downloadBundle).toHaveBeenCalledTimes(1);
    });
    expect(OfflineModeStore.isOn()).toBe(false);
  });

  it("shows download progress and cannot be clicked while downloading", () => {
    render(<OfflineModeControl />);

    _setEngineStatus({ kind: "downloading", progress: 0.42 });

    const control = screen.getByRole("button", { name: /42%/ });
    expect(control).toBeDisabled();
  });

  it("toggles offline mode once the offline models are downloaded", () => {
    _markBundleDownloaded();
    render(<OfflineModeControl />);

    const toggle = screen.getByRole("button", { name: "Offline mode" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);

    expect(OfflineModeStore.isOn()).toBe(true);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("removes the offline models and turns offline mode off from the dialog", async () => {
    _markBundleDownloaded();
    OfflineModeStore.setOn(true);
    render(<OfflineModeControl />);

    fireEvent.click(
      screen.getByRole("button", { name: "Manage offline models" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Remove offline models" }),
    );

    await waitFor(() => {
      expect(engineStore.deleteBundle).toHaveBeenCalledTimes(1);
    });
    expect(OfflineModeStore.isOn()).toBe(false);
  });

  it("is unavailable without WebGPU, whatever is downloaded", () => {
    _setWebGpu(false);
    _markBundleDownloaded();
    render(<OfflineModeControl />);

    const control = screen.getByRole("button", { name: "Offline mode" });
    fireEvent.click(control);

    expect(control).toHaveAttribute("aria-disabled", "true");
    expect(OfflineModeStore.isOn()).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows chat running offline when the browser loses its connection", () => {
    _markBundleDownloaded();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<OfflineModeControl />);

    const control = screen.getByRole("button", { name: "Running offline" });

    expect(control).toHaveAttribute("aria-pressed", "true");
  });
});
