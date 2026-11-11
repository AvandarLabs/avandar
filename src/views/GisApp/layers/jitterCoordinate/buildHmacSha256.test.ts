import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildHmacSha256 } from "@/views/GisApp/layers/jitterCoordinate/buildHmacSha256";

/** The reference digest from Node's own HMAC-SHA-256, as hex. */
function _buildReferenceHex(key: string, message: string): string {
  return createHmac("sha256", key).update(message).digest("hex");
}

function _toHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) => {
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
}

describe("buildHmacSha256", () => {
  it.each([
    ["", ""],
    ["key", "The quick brown fox jumps over the lazy dog"],
    ["8f14e45f-ceea-467a-9575-1a1c0c1e7f3b", "layer-1:0"],
    ["k".repeat(64), "exactly one block of key"],
    ["k".repeat(130), "a key longer than one block is hashed first"],
    ["salt", "m".repeat(55)],
    ["salt", "m".repeat(56)],
    ["salt", "m".repeat(200)],
    ["sälz", "ünïcode:42"],
  ])("matches Node's HMAC-SHA-256 for key %j", (key, message) => {
    expect(_toHex(buildHmacSha256({ key, message }))).toBe(
      _buildReferenceHex(key, message),
    );
  });
});
