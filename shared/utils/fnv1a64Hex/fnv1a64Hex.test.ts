import { describe, expect, it } from "vitest";
import { fnv1a64Hex } from "$/utils/fnv1a64Hex/fnv1a64Hex.ts";

describe("fnv1a64Hex", () => {
  it.each([
    ["", "cbf29ce484222325"],
    ["a", "af63dc4c8601ec8c"],
    ["foobar", "85944171f73967e8"],
  ])("hashes %j to the published FNV-1a 64 vector", (text, expected) => {
    expect(fnv1a64Hex(text)).toBe(expected);
  });

  it("hashes the UTF-8 bytes, so an accented letter differs from its base", () => {
    expect(fnv1a64Hex("é")).not.toBe(fnv1a64Hex("e"));
    expect(fnv1a64Hex("é")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("keeps leading zeros, so every hash is 16 digits", () => {
    const hashes = ["x", "y", "zip", "Kings", "1", "2"].map(fnv1a64Hex);

    expect(
      hashes.every((hash) => {
        return hash.length === 16;
      }),
    ).toBe(true);
  });
});
