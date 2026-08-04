import {
  base64UrlDecode,
  base64UrlEncode,
  hashTextPayload,
  toHex,
} from "$/utils/privacy/sessionSecretUtils.ts";
import { describe, expect, it } from "vitest";

describe("toHex", () => {
  it("encodes every byte as two lowercase hexadecimal characters", () => {
    expect(toHex(new Uint8Array([0, 15, 255]))).toBe("000fff");
  });
});

describe("base64url encoding", () => {
  it("uses URL-safe characters without padding and decodes back to bytes", () => {
    const bytes = new Uint8Array([251, 255]);
    const encoded = base64UrlEncode(bytes);

    expect(encoded).toBe("-_8");
    expect(base64UrlDecode(encoded)).toEqual(bytes);
  });
});

describe("hashTextPayload", () => {
  it("returns the lowercase SHA-256 digest for UTF-8 text", async () => {
    await expect(hashTextPayload("hello")).resolves.toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
