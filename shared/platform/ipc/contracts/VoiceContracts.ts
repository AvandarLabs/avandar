import { defineIpcContract } from "$/platform/ipc/contracts/defineIpcContract.ts";

/**
 * Voice-prompt IPC contracts.
 *
 * On desktop the native main process owns the Whisper.cpp runtime (via
 * `smart-whisper`) and the on-disk model cache; the webview reaches into
 * it through these contracts. Each contract mirrors a public method on
 * the `WhisperService` so the wire-level agreement matches the service
 * surface exactly.
 *
 * Progress updates are surfaced through polling: the React-side
 * `DesktopVoiceModelManager` calls `getStatus` on an interval while a
 * download is in flight. We deliberately avoid streaming over IPC here so
 * the existing request/reply framework can be reused as-is.
 */

/** Wire-shape for the per-call status snapshot. */
export type VoiceServiceStatus =
  | { kind: "idle" }
  | {
      kind: "downloading";
      modelId: string;
      progressPercent: number;
      currentFile?: string;
    }
  | { kind: "ready"; modelId: string }
  | { kind: "transcribing"; modelId: string }
  | { kind: "error"; modelId?: string; message: string };

export const VoiceContracts = {
  listDownloadedModels: defineIpcContract<
    Record<string, never>,
    { modelIds: readonly string[] }
  >("voice.listDownloadedModels"),

  isModelDownloaded: defineIpcContract<
    { modelId: string },
    { downloaded: boolean }
  >("voice.isModelDownloaded"),

  /**
   * Kicks off a model download. Returns immediately; the webview should
   * poll {@link VoiceContracts.getStatus} for progress.
   */
  downloadModel: defineIpcContract<{ modelId: string }, { started: boolean }>(
    "voice.downloadModel",
  ),

  getStatus: defineIpcContract<
    Record<string, never>,
    { status: VoiceServiceStatus }
  >("voice.getStatus"),

  /**
   * Transcribe 16 kHz mono Float32 PCM audio with the given model. The
   * raw audio is passed as a plain `Array<number>` because the IPC
   * envelope is JSON-serialised; for a typical voice prompt (≤30s) this
   * is ~480 k numbers, well within the bridge's payload budget.
   */
  transcribe: defineIpcContract<
    {
      modelId: string;
      language?: string;
      pcmSamples: readonly number[];
    },
    { text: string }
  >("voice.transcribe"),
} as const;
