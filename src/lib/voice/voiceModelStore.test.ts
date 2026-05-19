import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __TEST_ONLY,
  clearVoiceModelDownloaded,
  isVoiceModelMarkedDownloaded,
  listDownloadedVoiceModels,
  markVoiceModelDownloaded,
} from "./voiceModelStore";

describe("voiceModelStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns false for unmarked models", () => {
    expect(isVoiceModelMarkedDownloaded("whisper-tiny")).toBe(false);
  });

  it("round-trips download markers", () => {
    markVoiceModelDownloaded("whisper-tiny");
    expect(isVoiceModelMarkedDownloaded("whisper-tiny")).toBe(true);
    expect(listDownloadedVoiceModels()).toContain("whisper-tiny");
  });

  it("clears an individual model marker", () => {
    markVoiceModelDownloaded("whisper-tiny");
    markVoiceModelDownloaded("whisper-base");
    clearVoiceModelDownloaded("whisper-tiny");
    expect(isVoiceModelMarkedDownloaded("whisper-tiny")).toBe(false);
    expect(isVoiceModelMarkedDownloaded("whisper-base")).toBe(true);
  });

  it("tolerates malformed JSON in storage", () => {
    window.localStorage.setItem(__TEST_ONLY.STORAGE_KEY, "not-json");
    expect(isVoiceModelMarkedDownloaded("whisper-tiny")).toBe(false);
    expect(listDownloadedVoiceModels()).toEqual([]);
  });

  it("tolerates a non-object payload in storage", () => {
    window.localStorage.setItem(
      __TEST_ONLY.STORAGE_KEY,
      JSON.stringify([1, 2]),
    );
    expect(isVoiceModelMarkedDownloaded("whisper-tiny")).toBe(false);
  });
});
