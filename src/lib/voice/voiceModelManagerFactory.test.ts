import { afterEach, describe, expect, it } from "vitest";
import { __TEST_ONLY, getVoiceModelManager } from "./voiceModelManagerFactory";

describe("voiceModelManagerFactory", () => {
  afterEach(() => {
    __TEST_ONLY.resetDesktopSingleton();
    if (typeof document !== "undefined") {
      delete document.documentElement.dataset.avaPlatform;
    }
  });

  it("returns the web manager by default", () => {
    const manager = getVoiceModelManager();
    // Web manager is a singleton — calling again returns the same instance.
    expect(getVoiceModelManager()).toBe(manager);
  });

  it("returns a desktop manager when the platform signal is set", () => {
    document.documentElement.dataset.avaPlatform = "desktop";
    const desktop = getVoiceModelManager();
    expect(desktop).toBe(getVoiceModelManager());

    // Switching the signal back should yield a different (web) instance.
    delete document.documentElement.dataset.avaPlatform;
    expect(getVoiceModelManager()).not.toBe(desktop);
  });
});
