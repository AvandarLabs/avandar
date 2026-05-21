import { beforeEach, describe, expect, it, vi } from "vitest";
import { OfflineChatResourceManager } from "./OfflineChatResourceManager";

const { releaseLoadedPipelineMock } = vi.hoisted(() => {
  return {
    releaseLoadedPipelineMock: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/voice/voiceModelManagerFactory", () => {
  return {
    getVoiceModelManager: () => {
      return {
        releaseLoadedPipeline: releaseLoadedPipelineMock,
      };
    },
  };
});

vi.mock("./createOfflineChatEngine", () => {
  return {
    createOfflineChatEngine: () => {
      return {
        preload: vi.fn().mockResolvedValue(undefined),
        unload: vi.fn().mockResolvedValue(undefined),
        generate: vi.fn(),
      };
    },
  };
});

describe("OfflineChatResourceManager", () => {
  beforeEach(() => {
    releaseLoadedPipelineMock.mockClear();
    void OfflineChatResourceManager.unload();
  });

  it("releases the voice pipeline before loading the offline chat engine", async () => {
    await OfflineChatResourceManager.ensureEngine("llama-1b");

    expect(releaseLoadedPipelineMock).toHaveBeenCalledTimes(1);
    expect(OfflineChatResourceManager.getStatus()).toEqual({
      kind: "ready",
      modelId: "llama-1b",
    });
  });

  it("releases voice even when the requested engine is already resident", async () => {
    await OfflineChatResourceManager.ensureEngine("llama-1b");
    releaseLoadedPipelineMock.mockClear();

    await OfflineChatResourceManager.ensureEngine("llama-1b");

    expect(releaseLoadedPipelineMock).toHaveBeenCalledTimes(1);
  });
});
