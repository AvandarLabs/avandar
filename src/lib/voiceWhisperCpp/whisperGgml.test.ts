import { describe, expect, it } from "vitest";
import {
  ggmlFileNameForVoiceModelId,
  ggmlUrlForVoiceModelId,
} from "./whisperGgml";

describe("whisperGgml", () => {
  it("uses quantized ggml files on web", () => {
    expect(ggmlFileNameForVoiceModelId("whisper-tiny", "web")).toBe(
      "ggml-tiny-q5_1.bin",
    );
    expect(ggmlUrlForVoiceModelId("whisper-base", "web")).toBe(
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin",
    );
  });

  it("uses full-precision ggml files on desktop", () => {
    expect(ggmlFileNameForVoiceModelId("whisper-tiny", "desktop")).toBe(
      "ggml-tiny.bin",
    );
    expect(ggmlFileNameForVoiceModelId("whisper-small", "desktop")).toBe(
      "ggml-small.bin",
    );
  });

  it("rejects web-unsupported model ids", () => {
    expect(() => {
      return ggmlFileNameForVoiceModelId("whisper-small", "web");
    }).toThrow(/not available/);
  });
});
