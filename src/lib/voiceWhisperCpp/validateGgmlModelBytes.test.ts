import { describe, expect, it } from "vitest";
import {
  assertValidGgmlModelBytes,
  isValidGgmlModelBytes,
} from "./validateGgmlModelBytes";

describe("validateGgmlModelBytes", () => {
  it("accepts ggml-family magic as little-endian uint32 (whisper.cpp q5_1 files)", () => {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(0, 0x67676d6c, true);
    expect(isValidGgmlModelBytes(buffer)).toBe(true);
  });

  it("rejects legacy ASCII-order ggml bytes and HTML error pages", () => {
    const asciiGgml = new Uint8Array([0x67, 0x67, 0x6d, 0x6c]).buffer;
    expect(isValidGgmlModelBytes(asciiGgml)).toBe(false);

    const html = new TextEncoder().encode("<!DOCTYPE html>").buffer;
    expect(isValidGgmlModelBytes(html)).toBe(false);
    expect(() => {
      assertValidGgmlModelBytes(html, "ggml-base-q5_1.bin");
    }).toThrow(/not a valid ggml/);
  });
});
