import { describe, expect, it } from "vitest";
import { base64Encode } from "./sessionSecretUtils";

describe("base64Encode", () => {
  it("encodes bytes as standard padded base64", () => {
    expect(base64Encode(new Uint8Array([0, 255, 16]))).toBe("AP8Q");
  });
});
