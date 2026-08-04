import { base64ToUint8 } from "@utils/encoding/base64ToUint8/base64ToUint8.ts";
import { uint8ToBase64 } from "@utils/encoding/uint8ToBase64/uint8ToBase64.ts";
import { describe, expect, it } from "vitest";

describe("uint8ToBase64", () => {
  it("encodes an empty array to an empty string", () => {
    expect(uint8ToBase64(new Uint8Array())).toBe("");
  });

  it("encodes ASCII bytes to standard padded base64", () => {
    // "hi" => aGk=
    expect(uint8ToBase64(new Uint8Array([104, 105]))).toBe("aGk=");
  });

  it("round-trips arbitrary bytes through base64ToUint8", () => {
    const bytes = new Uint8Array([0, 1, 2, 127, 128, 200, 255]);
    expect(base64ToUint8(uint8ToBase64(bytes))).toEqual(bytes);
  });

  it("handles inputs larger than the 0x8000 chunk boundary", () => {
    const bytes = new Uint8Array(0x8000 * 2 + 5);
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = index % 256;
    }
    expect(base64ToUint8(uint8ToBase64(bytes))).toEqual(bytes);
  });
});
