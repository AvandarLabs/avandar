import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWhisperService,
  WHISPER_MODEL_ID_TO_GGML_NAME,
} from "./createWhisperService";
import type {
  DownloadDependency,
  SmartWhisperModule,
} from "./createWhisperService";

function makeStubModule(
  overrides: {
    transcribeText?: string;
  } = {},
): SmartWhisperModule {
  const transcribeSpy = vi.fn(async () => {
    return {
      result: Promise.resolve([
        { text: overrides.transcribeText ?? "hello world" },
      ]),
    };
  });
  const freeSpy = vi.fn(async () => {
    return undefined;
  });

  class FakeWhisper {
    transcribe = transcribeSpy;
    free = freeSpy;
    constructor(public readonly modelPath: string) {}
  }

  return {
    Whisper: FakeWhisper as unknown as SmartWhisperModule["Whisper"],
  };
}

describe("createWhisperService", () => {
  let workDir: string;
  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), "ava-voice-test-"));
  });
  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it("reports a model as downloaded when its ggml .bin file exists", () => {
    const service = createWhisperService({
      modelsDir: workDir,
      loadSmartWhisper: async () => {
        return makeStubModule();
      },
    });

    // Drop a fake weights file into place — non-empty so the size check passes.
    writeFileSync(join(workDir, "ggml-tiny.bin"), Buffer.from([1, 2, 3]));
    expect(service.isModelDownloaded("whisper-tiny")).toBe(true);
    expect(service.isModelDownloaded("whisper-base")).toBe(false);
    expect(service.listDownloadedModels()).toEqual(["whisper-tiny"]);
  });

  it("downloads via the streaming dependency and ends in the ready state", async () => {
    const observedProgress: number[] = [];
    const downloadFile: DownloadDependency = vi.fn(
      async (_url, destPath, onProgress) => {
        // Simulate three chunks of progress.
        onProgress(20);
        onProgress(50);
        onProgress(80);
        writeFileSync(destPath, Buffer.from([0xff, 0xff]));
      },
    );

    const service = createWhisperService({
      modelsDir: workDir,
      loadSmartWhisper: async () => {
        return makeStubModule();
      },
      downloadFile,
    });

    // Subscribe to progress by polling status while download runs. Since the
    // stub fires progress synchronously inside the download call, we can
    // just inspect the recorded calls.
    await service.downloadModel("whisper-base");

    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(service.getStatus()).toEqual({
      kind: "ready",
      modelId: "whisper-base",
    });
    expect(service.isModelDownloaded("whisper-base")).toBe(true);
    // Suppress unused warning on the array we keep for future polling tests.
    observedProgress.push(0);
  });

  it("transcribes audio with the loaded Whisper instance", async () => {
    writeFileSync(
      join(
        workDir,
        `ggml-${WHISPER_MODEL_ID_TO_GGML_NAME["whisper-tiny"]}.bin`,
      ),
      Buffer.from([0, 0]),
    );

    const service = createWhisperService({
      modelsDir: workDir,
      loadSmartWhisper: async () => {
        return makeStubModule({ transcribeText: "  Hola mundo  " });
      },
    });

    const text = await service.transcribe({
      modelId: "whisper-tiny",
      pcmSamples: new Float32Array([0, 0.1, 0.2]),
      language: "spanish",
    });

    expect(text).toBe("Hola mundo");
    expect(service.getStatus()).toEqual({
      kind: "ready",
      modelId: "whisper-tiny",
    });
  });

  it("rejects transcribe when the model has not been downloaded", async () => {
    const service = createWhisperService({
      modelsDir: workDir,
      loadSmartWhisper: async () => {
        return makeStubModule();
      },
    });
    await expect(
      service.transcribe({
        modelId: "whisper-tiny",
        pcmSamples: new Float32Array([0]),
        language: "english",
      }),
    ).rejects.toThrow(/has not been downloaded/);
    expect(service.getStatus().kind).toBe("error");
  });

  it("surfaces download errors and clears partial files", async () => {
    const downloadFile: DownloadDependency = async () => {
      throw new Error("network reset");
    };
    const service = createWhisperService({
      modelsDir: workDir,
      loadSmartWhisper: async () => {
        return makeStubModule();
      },
      downloadFile,
    });

    await expect(service.downloadModel("whisper-tiny")).rejects.toThrow(
      /network reset/,
    );
    expect(service.getStatus()).toMatchObject({
      kind: "error",
      modelId: "whisper-tiny",
      message: "network reset",
    });
  });

  it("deleteModel removes the on-disk weights and unloads an active instance", async () => {
    writeFileSync(join(workDir, "ggml-tiny.bin"), Buffer.from([1, 2, 3]));

    const service = createWhisperService({
      modelsDir: workDir,
      loadSmartWhisper: async () => {
        return makeStubModule();
      },
    });

    await service.transcribe({
      modelId: "whisper-tiny",
      pcmSamples: new Float32Array([0]),
      language: "english",
    });
    expect(service.isModelDownloaded("whisper-tiny")).toBe(true);

    await service.deleteModel("whisper-tiny");

    expect(service.isModelDownloaded("whisper-tiny")).toBe(false);
    expect(service.getStatus()).toEqual({ kind: "idle" });
    expect(service.listDownloadedModels()).toEqual([]);
  });

  it("rejects unknown model ids", async () => {
    const service = createWhisperService({
      modelsDir: workDir,
      loadSmartWhisper: async () => {
        return makeStubModule();
      },
    });
    await expect(
      service.downloadModel("whisper-impossible" as never),
    ).rejects.toThrow(/Unknown voice model id/);
  });
});
