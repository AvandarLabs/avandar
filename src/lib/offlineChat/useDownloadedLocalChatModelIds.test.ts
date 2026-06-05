import { act, renderHook } from "@/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearLocalChatModelDownloaded,
  markLocalChatModelDownloaded,
} from "./localChatModelStore";
import { useDownloadedLocalChatModelIds } from "./useDownloadedLocalChatModelIds";

describe("useDownloadedLocalChatModelIds", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns a stable array reference when the downloaded set is unchanged", () => {
    markLocalChatModelDownloaded("qwen-1.5b");

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
      markLocalChatModelDownloaded("llama-1b");
    });
    rerender();

    expect(result.current).toEqual(["llama-1b"]);
  });

  it("updates when a model is cleared from the downloaded set", () => {
    markLocalChatModelDownloaded("qwen-1.5b");

    const { result, rerender } = renderHook(() => {
      return useDownloadedLocalChatModelIds();
    });

    expect(result.current).toEqual(["qwen-1.5b"]);

    act(() => {
      clearLocalChatModelDownloaded("qwen-1.5b");
    });
    rerender();

    expect(result.current).toEqual([]);
  });
});
