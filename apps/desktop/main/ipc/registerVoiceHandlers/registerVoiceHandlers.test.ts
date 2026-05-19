import { VoiceContracts } from "$/platform/ipc/contracts/VoiceContracts";
import { describe, expect, it, vi } from "vitest";
import { createIpcServer } from "../createIpcServer/createIpcServer";
import { registerVoiceHandlers } from "./registerVoiceHandlers";
import type { WhisperService } from "../../services/createWhisperService/createWhisperService";
import type { IpcTransport } from "../createIpcServer/createIpcServer";

function makeFakeTransport(): {
  transport: IpcTransport;
  inbox: Record<string, (message: unknown) => void>;
  send: ReturnType<typeof vi.fn>;
} {
  const inbox: Record<string, (message: unknown) => void> = {};
  const send = vi.fn();
  return {
    transport: {
      on: (channel, cb) => {
        inbox[channel] = cb;
      },
      send,
    },
    inbox,
    send,
  };
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

function makeFakeService(
  overrides: Partial<WhisperService> = {},
): WhisperService {
  return {
    listDownloadedModels: () => {
      return ["whisper-tiny"];
    },
    isModelDownloaded: (id: string) => {
      return id === "whisper-tiny";
    },
    downloadModel: vi.fn().mockResolvedValue(undefined),
    transcribe: vi.fn().mockResolvedValue("transcribed text"),
    getStatus: () => {
      return { kind: "idle" } as const;
    },
    close: async () => {
      return undefined;
    },
    ...overrides,
  };
}

describe("registerVoiceHandlers", () => {
  it("replies to listDownloadedModels with the service's list", async () => {
    const { transport, inbox, send } = makeFakeTransport();
    const server = createIpcServer(transport);
    registerVoiceHandlers(server, makeFakeService());

    inbox[VoiceContracts.listDownloadedModels.name]?.({
      id: "req-1",
      payload: {},
    });
    await flushMicrotasks();

    expect(send).toHaveBeenCalledWith(
      `${VoiceContracts.listDownloadedModels.name}.reply`,
      { id: "req-1", ok: true, result: { modelIds: ["whisper-tiny"] } },
    );
  });

  it("returns immediately from downloadModel and lets the service run in background", async () => {
    const { transport, inbox, send } = makeFakeTransport();
    let resolveDownload: () => void = () => {
      return undefined;
    };
    const downloadPromise = new Promise<void>((resolve) => {
      resolveDownload = resolve;
    });
    const downloadModel = vi.fn().mockReturnValue(downloadPromise);
    const server = createIpcServer(transport);
    registerVoiceHandlers(server, makeFakeService({ downloadModel }));

    inbox[VoiceContracts.downloadModel.name]?.({
      id: "req-2",
      payload: { modelId: "whisper-large-v3" },
    });
    await flushMicrotasks();

    expect(send).toHaveBeenCalledWith(
      `${VoiceContracts.downloadModel.name}.reply`,
      { id: "req-2", ok: true, result: { started: true } },
    );
    expect(downloadModel).toHaveBeenCalledWith("whisper-large-v3");
    // Cleanup so promise doesn't leak.
    resolveDownload();
  });

  it("decodes the Array<number> payload into a Float32Array for transcribe", async () => {
    const { transport, inbox, send } = makeFakeTransport();
    const transcribe = vi.fn(
      async ({ pcmSamples }: { pcmSamples: Float32Array }) => {
        expect(pcmSamples).toBeInstanceOf(Float32Array);
        // Float32 round-trip loses a tiny amount of precision; check the
        // first sample is close enough rather than exact equality.
        expect(pcmSamples.length).toBe(3);
        expect(pcmSamples[0]).toBeCloseTo(0.1, 5);
        expect(pcmSamples[1]).toBeCloseTo(0.2, 5);
        expect(pcmSamples[2]).toBeCloseTo(0.3, 5);
        return "decoded text";
      },
    );
    const server = createIpcServer(transport);
    registerVoiceHandlers(server, makeFakeService({ transcribe }));

    inbox[VoiceContracts.transcribe.name]?.({
      id: "req-3",
      payload: {
        modelId: "whisper-tiny",
        language: "french",
        pcmSamples: [0.1, 0.2, 0.3],
      },
    });
    await flushMicrotasks();

    expect(send).toHaveBeenCalledWith(
      `${VoiceContracts.transcribe.name}.reply`,
      { id: "req-3", ok: true, result: { text: "decoded text" } },
    );
  });
});
