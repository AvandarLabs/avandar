/**
 * Download markers for whisper.cpp ggml weights (separate from transformers
 * legacy transformers ONNX marker).
 */

import type { VoiceModelId } from "@/lib/voice/voiceModels";

const STORAGE_KEY = "avandar.voice.whisperCpp.downloadedModels";

type DownloadedModelsRecord = Partial<Record<VoiceModelId, true>>;

function readStorage(): DownloadedModelsRecord {
  if (typeof window === "undefined" || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as DownloadedModelsRecord;
    }
    return {};
  } catch {
    return {};
  }
}

function writeStorage(record: DownloadedModelsRecord): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function isWhisperCppVoiceModelMarkedDownloaded(
  id: VoiceModelId,
): boolean {
  return readStorage()[id] === true;
}

export function markWhisperCppVoiceModelDownloaded(id: VoiceModelId): void {
  const record = readStorage();
  record[id] = true;
  writeStorage(record);
}

export function clearWhisperCppVoiceModelDownloaded(id: VoiceModelId): void {
  const record = readStorage();
  delete record[id];
  writeStorage(record);
}

export function listDownloadedWhisperCppVoiceModels(): readonly VoiceModelId[] {
  return Object.keys(readStorage()) as VoiceModelId[];
}

export const __TEST_ONLY = {
  STORAGE_KEY,
  readStorage,
  writeStorage,
};
