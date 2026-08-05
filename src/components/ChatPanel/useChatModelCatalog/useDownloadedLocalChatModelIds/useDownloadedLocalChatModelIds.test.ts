import { afterEach, describe, expect, it } from "vitest";
import { useDownloadedLocalChatModelIds } from "@/components/ChatPanel/useChatModelCatalog/useDownloadedLocalChatModelIds/useDownloadedLocalChatModelIds";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { act, renderHook } from "@/test-utils";

describe("useDownloadedLocalChatModelIds", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns a stable array reference when the downloaded set is unchanged", () => {
    LocalChatModelStore.markDownloaded("qwen-1.5b");

    const { result, rerender } = renderHook(() => {
      return useDownloadedLocalChatModelIds();
    });

    const firstSnapshot = result.current;
    rerender();
    expect(result.current).toBe(firstSnapshot);
  });

  it("updates when a model is marked downloaded", () => {
    const { result, rerender } = renderHook(() => {
      return useDownloadedLocalChatModelIds();
    });

    expect(result.current).toEqual([]);

    act(() => {
      LocalChatModelStore.markDownloaded("llama-1b");
    });
    rerender();

    expect(result.current).toEqual(["llama-1b"]);
  });

  it("updates when a model is cleared from the downloaded set", () => {
    LocalChatModelStore.markDownloaded("qwen-1.5b");

    const { result, rerender } = renderHook(() => {
      return useDownloadedLocalChatModelIds();
    });

    expect(result.current).toEqual(["qwen-1.5b"]);

    act(() => {
      LocalChatModelStore.clearDownloaded("qwen-1.5b");
    });
    rerender();

    expect(result.current).toEqual([]);
  });
});
