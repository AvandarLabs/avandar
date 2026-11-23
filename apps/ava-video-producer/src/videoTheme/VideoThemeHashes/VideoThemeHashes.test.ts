import assert from "node:assert/strict";
import test from "node:test";
import { VideoThemeHashes } from "./VideoThemeHashes";

test("canonical JSON sorts object keys at every depth and drops undefined", () => {
  assert.equal(
    VideoThemeHashes.makeCanonicalJsonFromValue({
      b: 1,
      a: { d: [2, { f: 3, e: undefined }], c: true },
    }),
    '{"a":{"c":true,"d":[2,{"f":3}]},"b":1}',
  );
});

test("the hash ignores key order", () => {
  assert.equal(
    VideoThemeHashes.fromContent({ accent: "#51a7ff", ground: "#0b1219" }),
    VideoThemeHashes.fromContent({ ground: "#0b1219", accent: "#51a7ff" }),
  );
});

test("the hash changes when a value changes", () => {
  assert.notEqual(
    VideoThemeHashes.fromContent({ accent: "#51a7ff" }),
    VideoThemeHashes.fromContent({ accent: "#51a7fe" }),
  );
});
