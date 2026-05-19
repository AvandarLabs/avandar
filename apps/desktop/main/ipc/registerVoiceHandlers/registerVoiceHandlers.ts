/*
 * IPC handler registration for the desktop voice-prompt feature.
 *
 * Bun-main side of the contracts declared in
 * `shared/platform/ipc/contracts/VoiceContracts.ts`. Each handler is a
 * thin pass-through to the {@link WhisperService} so request/response
 * envelopes stay close to the service's public surface.
 *
 * `downloadModel` returns immediately and lets the long-running download
 * run in the background. The webview polls {@link
 * VoiceContracts.getStatus} for progress.
 */

import { VoiceContracts } from "$/platform/ipc/contracts/VoiceContracts";
import type { IpcServer } from "../createIpcServer/createIpcServer";
import type { WhisperService } from "../../services/createWhisperService/createWhisperService";

export function registerVoiceHandlers(
  ipcServer: IpcServer,
  whisperService: WhisperService,
): void {
  ipcServer.handle(VoiceContracts.listDownloadedModels, () => {
    return { modelIds: whisperService.listDownloadedModels() };
  });

  ipcServer.handle(VoiceContracts.isModelDownloaded, (req) => {
    return { downloaded: whisperService.isModelDownloaded(req.modelId) };
  });

  ipcServer.handle(VoiceContracts.downloadModel, (req) => {
    // Kick off the download but don't await — the handler returns
    // immediately and the webview polls for progress. Swallow rejections
    // here because they're already surfaced in the service's status.
    void whisperService.downloadModel(req.modelId).catch(() => {
      return undefined;
    });
    return { started: true };
  });

  ipcServer.handle(VoiceContracts.getStatus, () => {
    return { status: whisperService.getStatus() };
  });

  ipcServer.handle(VoiceContracts.transcribe, async (req) => {
    const samples = new Float32Array(req.pcmSamples);
    const text = await whisperService.transcribe({
      modelId: req.modelId,
      pcmSamples: samples,
      language: req.language,
    });
    return { text };
  });
}
