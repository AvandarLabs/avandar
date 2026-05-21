import { beforeEach, describe, expect, it } from "vitest";
import {
  __TEST_ONLY,
  clearWhisperCppVoiceModelDownloaded,
  isWhisperCppVoiceModelMarkedDownloaded,
  markWhisperCppVoiceModelDownloaded,
} from "./whisperCppVoiceModelStore";

describe("whisperCppVoiceModelStore", () => {
  beforeEach(() => {
    window.localStorage.removeItem(__TEST_ONLY.STORAGE_KEY);
  });

  it("tracks downloaded markers independently from transformers store", () => {
    expect(isWhisperCppVoiceModelMarkedDownloaded("whisper-tiny")).toBe(false);
    markWhisperCppVoiceModelDownloaded("whisper-tiny");
    expect(isWhisperCppVoiceModelMarkedDownloaded("whisper-tiny")).toBe(true);
    clearWhisperCppVoiceModelDownloaded("whisper-tiny");
    expect(isWhisperCppVoiceModelMarkedDownloaded("whisper-tiny")).toBe(false);
  });
});
