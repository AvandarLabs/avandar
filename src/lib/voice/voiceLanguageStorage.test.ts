import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  hasStoredVoiceLanguage,
  readStoredVoiceLanguage,
  VOICE_LANGUAGE_STORAGE_KEY,
  writeStoredVoiceLanguage,
} from "./voiceLanguageStorage";

describe("voiceLanguageStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns undefined when nothing is stored", () => {
    expect(readStoredVoiceLanguage()).toBeUndefined();
    expect(hasStoredVoiceLanguage()).toBe(false);
  });

  it("round-trips a supported language code", () => {
    writeStoredVoiceLanguage("spanish");
    expect(readStoredVoiceLanguage()).toBe("spanish");
    expect(hasStoredVoiceLanguage()).toBe(true);
  });

  it("ignores unknown codes in storage", () => {
    window.localStorage.setItem(VOICE_LANGUAGE_STORAGE_KEY, "klingon");
    expect(readStoredVoiceLanguage()).toBeUndefined();
    expect(hasStoredVoiceLanguage()).toBe(false);
  });
});
