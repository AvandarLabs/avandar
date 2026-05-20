import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsVoicePromptAvailable } from "./useIsVoicePromptAvailable";

const { isOnlineRef, isModelDownloadedMock, voiceManagerMock } = vi.hoisted(
  () => {
    const isModelDownloaded = vi.fn().mockResolvedValue(false);
    return {
      isOnlineRef: { current: true },
      isModelDownloadedMock: isModelDownloaded,
      voiceManagerMock: { isModelDownloaded },
    };
  },
);

vi.mock("@/lib/offline/useIsOnline", () => {
  return {
    useIsOnline: () => {
      return isOnlineRef.current;
    },
  };
});

vi.mock("@/lib/voice/useVoiceModelManager", () => {
  return {
    useVoiceModelManager: () => {
      return voiceManagerMock;
    },
  };
});

vi.mock("@/hooks/usePlatformInfo/usePlatformInfo", () => {
  return {
    usePlatformInfo: () => {
      return "web";
    },
  };
});

describe("useIsVoicePromptAvailable", () => {
  beforeEach(() => {
    isOnlineRef.current = true;
    isModelDownloadedMock.mockReset();
    isModelDownloadedMock.mockResolvedValue(false);
  });

  it("is available when online even without a cached model", async () => {
    const { result } = renderHook(() => {
      return useIsVoicePromptAvailable();
    });
    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });
    expect(result.current.isAvailable).toBe(true);
  });

  it("is available offline when a model is cached", async () => {
    isOnlineRef.current = false;
    isModelDownloadedMock.mockResolvedValue(true);
    const { result } = renderHook(() => {
      return useIsVoicePromptAvailable();
    });
    await waitFor(() => {
      expect(result.current.hasAnyDownloaded).toBe(true);
    });
    expect(result.current.isAvailable).toBe(true);
  });

  it("is unavailable offline when no model is cached", async () => {
    isOnlineRef.current = false;
    const { result } = renderHook(() => {
      return useIsVoicePromptAvailable();
    });
    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });
    expect(result.current.isAvailable).toBe(false);
  });
});
