import { describe, expect, it } from "vitest";
import {
  isWhisperCppModelAvailableOnPlatform,
  listWhisperCppModelsForPlatform,
  listWhisperCppVoiceModelsSorted,
} from "./whisperCppVoiceModels";

describe("whisperCppVoiceModels", () => {
  it("offers only tiny and base on web", () => {
    const webIds = listWhisperCppModelsForPlatform("web").map((model) => {
      return model.id;
    });
    expect(webIds).toEqual(["whisper-tiny", "whisper-base"]);
  });

  it("offers all catalog models on desktop", () => {
    expect(listWhisperCppModelsForPlatform("desktop")).toHaveLength(6);
  });

  it("sorts catalog by RAM then download size", () => {
    const sorted = listWhisperCppVoiceModelsSorted("desktop").map((model) => {
      return model.id;
    });
    expect(sorted).toEqual([
      "whisper-tiny",
      "whisper-base",
      "whisper-small",
      "whisper-medium",
      "whisper-large-v3-turbo",
      "whisper-large-v3",
    ]);
  });

  it("marks small as unavailable on web", () => {
    const small = listWhisperCppVoiceModelsSorted("desktop").find((model) => {
      return model.id === "whisper-small";
    });
    expect(small).toBeDefined();
    expect(isWhisperCppModelAvailableOnPlatform(small!, "web")).toBe(false);
  });
});
