/**
 * Desktop voice-model manager.
 *
 * Talks to the Bun-main `WhisperService` over IPC. The actual whisper.cpp
 * runtime lives in the main process, so this class is purely orchestration:
 *
 * - `ensureModelLoaded` kicks off a background download (fire-and-forget on
 *   the IPC side) and polls `voice.getStatus` until the service reports
 *   `ready` or `error`. The polled status is rebroadcast to local
 *   subscribers exactly as if it had been emitted by a single in-process
 *   manager.
 * - `transcribe` ships the 16 kHz Float32 PCM samples to main as an
 *   `Array<number>` (the IPC envelope is JSON) and resolves with the text.
 * - `isModelDownloaded` is a synchronous IPC round-trip to check the
 *   on-disk weight cache.
 *
 * The class implements the same `IVoiceModelManager` interface as the
 * web `VoiceModelManager`, so React components are platform-agnostic.
 */

import { VoiceContracts } from "$/platform/ipc/contracts/VoiceContracts";
import {
  createDownloadingStatus,
  downloadingStatusFromDesktopSnapshot,
} from "./voiceDownloadProgress";
import { isSameVoiceManagerStatus } from "./voiceManagerInterface";
import type {
  IVoiceModelManager,
  VoiceManagerListener,
  VoiceManagerStatus,
} from "./voiceManagerInterface";
import type { VoiceLanguageCode, VoiceModelId } from "./voiceModels";
import type { IpcContract } from "$/platform/ipc/contracts/defineIpcContract";
import type { VoiceServiceStatus } from "$/platform/ipc/contracts/VoiceContracts";

type CallIpcFn = <TRequest, TResponse>(
  contract: Readonly<IpcContract<TRequest, TResponse>>,
  request: Readonly<TRequest>,
) => Promise<TResponse>;

const PROGRESS_POLL_INTERVAL_MS = 500;
const PROGRESS_POLL_MAX_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function adaptServiceStatus(raw: VoiceServiceStatus): VoiceManagerStatus {
  switch (raw.kind) {
    case "idle":
      return { kind: "idle" };
    case "downloading":
      return downloadingStatusFromDesktopSnapshot(
        raw.modelId as VoiceModelId,
        raw.progressPercent,
        raw.currentFile,
        { kind: "idle" },
      );
    case "ready":
      return { kind: "ready", modelId: raw.modelId as VoiceModelId };
    case "transcribing":
      return { kind: "transcribing", modelId: raw.modelId as VoiceModelId };
    case "error":
      return {
        kind: "error",
        modelId: raw.modelId as VoiceModelId | undefined,
        message: raw.message,
      };
  }
}

export type DesktopVoiceManagerDependencies = {
  callIpc: CallIpcFn;
  /** Schedules `cb` after `ms` ms. Injected for tests. */
  setTimer?: (cb: () => void, ms: number) => unknown;
  /** Cancels a timer handle from `setTimer`. */
  clearTimer?: (handle: unknown) => void;
  /** Wall-clock source for the polling watchdog; defaults to `Date.now`. */
  now?: () => number;
};

export class DesktopVoiceModelManager implements IVoiceModelManager {
  private status: VoiceManagerStatus = { kind: "idle" };

  private readonly listeners = new Set<VoiceManagerListener>();

  private readonly callIpc: CallIpcFn;

  private readonly setTimer: (cb: () => void, ms: number) => unknown;

  private readonly clearTimer: (handle: unknown) => void;

  private readonly now: () => number;

  private pollHandle: unknown = null;

  private readonly loadInFlight = new Map<VoiceModelId, Promise<void>>();

  constructor(deps: DesktopVoiceManagerDependencies) {
    this.callIpc = deps.callIpc;
    this.setTimer =
      deps.setTimer ??
      ((cb, ms) => {
        return setTimeout(cb, ms);
      });
    this.clearTimer =
      deps.clearTimer ??
      ((handle) => {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
      });
    this.now = deps.now ?? Date.now;
  }

  getStatus(): VoiceManagerStatus {
    return this.status;
  }

  subscribe(listener: VoiceManagerListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async isModelDownloaded(id: VoiceModelId): Promise<boolean> {
    try {
      const { downloaded } = await this.callIpc(
        VoiceContracts.isModelDownloaded,
        { modelId: id },
      );
      return downloaded;
    } catch {
      return false;
    }
  }

  async deleteModel(id: VoiceModelId): Promise<void> {
    await this.callIpc(VoiceContracts.deleteModel, { modelId: id });
    if (
      this.status.kind !== "idle" &&
      ("modelId" in this.status ? this.status.modelId === id : false)
    ) {
      this.setStatus({ kind: "idle" });
    }
  }

  async ensureModelLoaded(id: VoiceModelId): Promise<void> {
    // Short-circuit if the service already reports the model as ready.
    if (await this.isModelDownloaded(id)) {
      this.setStatus({ kind: "ready", modelId: id });
      return;
    }

    const inFlight = this.loadInFlight.get(id);
    if (inFlight) {
      return inFlight;
    }

    const loadPromise = this.runEnsureModelLoaded(id);
    this.loadInFlight.set(id, loadPromise);
    try {
      await loadPromise;
    } finally {
      this.loadInFlight.delete(id);
    }
  }

  private async runEnsureModelLoaded(id: VoiceModelId): Promise<void> {
    if (this.status.kind !== "downloading" || this.status.modelId !== id) {
      this.setStatus(createDownloadingStatus(id));
    }
    await this.callIpc(VoiceContracts.downloadModel, { modelId: id });

    await this.waitForReadyOrError(id);
  }

  async transcribe(
    audio: Float32Array,
    options: { modelId: VoiceModelId; language?: VoiceLanguageCode },
  ): Promise<string> {
    this.setStatus({ kind: "transcribing", modelId: options.modelId });
    try {
      const { text } = await this.callIpc(VoiceContracts.transcribe, {
        modelId: options.modelId,
        language:
          options.language && options.language !== "auto" ?
            options.language
          : undefined,
        pcmSamples: Array.from(audio),
      });
      this.setStatus({ kind: "ready", modelId: options.modelId });
      return text.trim();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Transcription failed";
      this.setStatus({
        kind: "error",
        modelId: options.modelId,
        message,
      });
      throw err;
    }
  }

  private async waitForReadyOrError(modelId: VoiceModelId): Promise<void> {
    const startedAt = this.now();

    return new Promise<void>((resolve, reject) => {
      const poll = async (): Promise<void> => {
        try {
          const { status: raw } = await this.callIpc(
            VoiceContracts.getStatus,
            {},
          );
          const next =
            raw.kind === "downloading" ?
              downloadingStatusFromDesktopSnapshot(
                raw.modelId as VoiceModelId,
                raw.progressPercent,
                raw.currentFile,
                this.status,
              )
            : adaptServiceStatus(raw);
          this.setStatus(next);

          if (next.kind === "ready" && next.modelId === modelId) {
            this.pollHandle = null;
            resolve();
            return;
          }
          if (next.kind === "error") {
            this.pollHandle = null;
            reject(new Error(next.message));
            return;
          }

          if (this.now() - startedAt > PROGRESS_POLL_MAX_DURATION_MS) {
            const timeoutError = new Error(
              `Voice model download timed out after ${PROGRESS_POLL_MAX_DURATION_MS} ms`,
            );
            this.setStatus({
              kind: "error",
              modelId,
              message: timeoutError.message,
            });
            this.pollHandle = null;
            reject(timeoutError);
            return;
          }

          this.pollHandle = this.setTimer(() => {
            void poll();
          }, PROGRESS_POLL_INTERVAL_MS);
        } catch (err) {
          this.pollHandle = null;
          const message =
            err instanceof Error ? err.message : "Failed to poll voice status";
          this.setStatus({ kind: "error", modelId, message });
          reject(err instanceof Error ? err : new Error(message));
        }
      };

      void poll();
    });
  }

  /** Cancels any active poll loop. Used by tests + cleanup. */
  stopPolling(): void {
    if (this.pollHandle !== null) {
      this.clearTimer(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private setStatus(next: VoiceManagerStatus): void {
    if (isSameVoiceManagerStatus(this.status, next)) {
      return;
    }
    this.status = next;
    this.listeners.forEach((listener) => {
      listener(next);
    });
  }
}
