import { base64ToUint8 } from "@utils/encoding/base64ToUint8/base64ToUint8.ts";
import { describe, expect, it } from "vitest";

describe("base64ToUint8", () => {
  it("decodes an empty string to an empty array", () => {
    expect(base64ToUint8("")).toEqual(new Uint8Array());
  });

  it("decodes standard padded base64 to bytes", () => {
    expect(base64ToUint8("aGk=")).toEqual(new Uint8Array([104, 105]));
  });

  it("preserves high (non-ASCII) byte values", () => {
    expect(base64ToUint8("gMj/")).toEqual(new Uint8Array([128, 200, 255]));
  });
});
