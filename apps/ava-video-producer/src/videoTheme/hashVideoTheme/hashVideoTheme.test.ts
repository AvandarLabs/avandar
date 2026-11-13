import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalJsonFromValue,
  buildVideoThemeHashFromContent,
} from "./hashVideoTheme";

test("canonical JSON sorts object keys at every depth and drops undefined", () => {
  assert.equal(
    buildCanonicalJsonFromValue({
      b: 1,
      a: { d: [2, { f: 3, e: undefined }], c: true },
    }),
    '{"a":{"c":true,"d":[2,{"f":3}]},"b":1}',
  );
});

test("the hash ignores key order", () => {
  assert.equal(
    buildVideoThemeHashFromContent({ accent: "#51a7ff", ground: "#0b1219" }),
    buildVideoThemeHashFromContent({ ground: "#0b1219", accent: "#51a7ff" }),
  );
});

test("the hash changes when a value changes", () => {
  assert.notEqual(
    buildVideoThemeHashFromContent({ accent: "#51a7ff" }),
    buildVideoThemeHashFromContent({ accent: "#51a7fe" }),
  );
});
