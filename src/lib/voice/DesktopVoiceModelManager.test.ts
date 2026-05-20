import { VoiceContracts } from "$/platform/ipc/contracts/VoiceContracts";
import { describe, expect, it, vi } from "vitest";
import { DesktopVoiceModelManager } from "./DesktopVoiceModelManager";

type CallIpcImpl = ReturnType<typeof vi.fn>;

function makeCallIpc(impls: {
  isModelDownloaded?: (req: { modelId: string }) => unknown;
  downloadModel?: (req: { modelId: string }) => unknown;
  getStatus?: () => unknown;
  transcribe?: (req: {
    modelId: string;
    language?: string;
    pcmSamples: readonly number[];
  }) => unknown;
}): CallIpcImpl {
  return vi.fn((contract, request) => {
    switch (contract.name) {
      case VoiceContracts.isModelDownloaded.name:
        return Promise.resolve(
          impls.isModelDownloaded?.(request as { modelId: string }) ?? {
            downloaded: false,
          },
        );
      case VoiceContracts.downloadModel.name:
        return Promise.resolve(
          impls.downloadModel?.(request as { modelId: string }) ?? {
            started: true,
          },
        );
      case VoiceContracts.getStatus.name:
        return Promise.resolve(
          impls.getStatus?.() ?? { status: { kind: "idle" } },
        );
      case VoiceContracts.transcribe.name:
        return Promise.resolve(
          impls.transcribe?.(
            request as {
              modelId: string;
              language?: string;
              pcmSamples: readonly number[];
            },
          ) ?? { text: "" },
        );
      default:
        throw new Error(`Unexpected contract: ${contract.name}`);
    }
  }) as CallIpcImpl;
}

function makeImmediateTimer(): {
  setTimer: (cb: () => void) => unknown;
  clearTimer: (handle: unknown) => void;
} {
  return {
    setTimer: (cb) => {
      // Run on the next microtask so the polling loop doesn't recurse
      // synchronously and blow the stack in tests with many iterations.
      void Promise.resolve().then(() => {
        cb();
      });
      return Symbol("timer-handle");
    },
    clearTimer: () => {
      return undefined;
    },
  };
}

describe("DesktopVoiceModelManager", () => {
  it("short-circuits ensureModelLoaded when the model is already on disk", async () => {
    const callIpc = makeCallIpc({
      isModelDownloaded: () => {
        return { downloaded: true };
      },
    });

    const manager = new DesktopVoiceModelManager({ callIpc });
    await manager.ensureModelLoaded("whisper-tiny");

    expect(manager.getStatus()).toEqual({
      kind: "ready",
      modelId: "whisper-tiny",
    });
    // Should NOT have called downloadModel
    expect(
      callIpc.mock.calls.find((call) => {
        return call[0].name === VoiceContracts.downloadModel.name;
      }),
    ).toBeUndefined();
  });

  it("calls downloadModel and polls getStatus until ready", async () => {
    let pollCount = 0;
    const callIpc = makeCallIpc({
      isModelDownloaded: () => {
        return { downloaded: false };
      },
      getStatus: () => {
        pollCount += 1;
        if (pollCount < 3) {
          return {
            status: {
              kind: "downloading",
              modelId: "whisper-large-v3",
              progressPercent: pollCount * 30,
              currentFile: "ggml-large-v3.bin",
            },
          };
        }
        return { status: { kind: "ready", modelId: "whisper-large-v3" } };
      },
    });
    const { setTimer, clearTimer } = makeImmediateTimer();

    const manager = new DesktopVoiceModelManager({
      callIpc,
      setTimer,
      clearTimer,
    });

    const seen: string[] = [];
    manager.subscribe((s) => {
      seen.push(s.kind);
    });

    await manager.ensureModelLoaded("whisper-large-v3");
    expect(manager.getStatus()).toEqual({
      kind: "ready",
      modelId: "whisper-large-v3",
    });
    expect(seen).toContain("downloading");
    expect(seen[seen.length - 1]).toBe("ready");
    expect(pollCount).toBe(3);
  });

  it("coalesces concurrent ensureModelLoaded calls into one downloadModel IPC", async () => {
    const callIpc = makeCallIpc({
      isModelDownloaded: () => {
        return { downloaded: false };
      },
      getStatus: () => {
        return {
          status: { kind: "ready", modelId: "whisper-tiny" },
        };
      },
    });
    const { setTimer, clearTimer } = makeImmediateTimer();

    const manager = new DesktopVoiceModelManager({
      callIpc,
      setTimer,
      clearTimer,
    });

    await Promise.all([
      manager.ensureModelLoaded("whisper-tiny"),
      manager.ensureModelLoaded("whisper-tiny"),
    ]);

    const downloadCalls = callIpc.mock.calls.filter((call) => {
      return call[0].name === VoiceContracts.downloadModel.name;
    });
    expect(downloadCalls).toHaveLength(1);
  });

  it("rejects ensureModelLoaded when the service reports an error", async () => {
    const callIpc = makeCallIpc({
      isModelDownloaded: () => {
        return { downloaded: false };
      },
      getStatus: () => {
        return {
          status: {
            kind: "error",
            modelId: "whisper-large-v3",
            message: "disk full",
          },
        };
      },
    });
    const { setTimer, clearTimer } = makeImmediateTimer();

    const manager = new DesktopVoiceModelManager({
      callIpc,
      setTimer,
      clearTimer,
    });

    await expect(manager.ensureModelLoaded("whisper-large-v3")).rejects.toThrow(
      /disk full/,
    );
    expect(manager.getStatus().kind).toBe("error");
  });

  it("forwards the Float32 audio to the IPC transcribe contract and returns text", async () => {
    const callIpc = makeCallIpc({
      isModelDownloaded: () => {
        return { downloaded: true };
      },
      transcribe: (req) => {
        expect(req.modelId).toBe("whisper-medium");
        expect(req.language).toBe("spanish");
        expect(req.pcmSamples.length).toBe(4);
        return { text: "  Buenos días  " };
      },
    });

    const manager = new DesktopVoiceModelManager({ callIpc });
    const text = await manager.transcribe(new Float32Array([0, 1, 2, 3]), {
      modelId: "whisper-medium",
      language: "spanish",
    });

    expect(text).toBe("Buenos días");
  });

  it("omits language when set to auto so Whisper auto-detects", async () => {
    const transcribeSpy = vi.fn().mockReturnValue({ text: "result" });
    const callIpc = makeCallIpc({
      isModelDownloaded: () => {
        return { downloaded: true };
      },
      transcribe: (req) => {
        return transcribeSpy(req);
      },
    });

    const manager = new DesktopVoiceModelManager({ callIpc });
    await manager.transcribe(new Float32Array([0]), {
      modelId: "whisper-tiny",
      language: "auto",
    });

    const arg = transcribeSpy.mock.calls[0]?.[0] as { language?: string };
    expect(arg.language).toBeUndefined();
  });

  it("returns false from isModelDownloaded when the IPC call rejects", async () => {
    const callIpc = vi.fn().mockRejectedValue(new Error("ipc down"));
    const manager = new DesktopVoiceModelManager({ callIpc });
    expect(await manager.isModelDownloaded("whisper-tiny")).toBe(false);
  });
});
