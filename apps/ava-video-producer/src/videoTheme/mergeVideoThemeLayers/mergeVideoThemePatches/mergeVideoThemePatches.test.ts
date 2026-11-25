import assert from "node:assert/strict";
import test from "node:test";
import { mergeVideoThemePatches } from "./mergeVideoThemePatches";

test("objects merge and later patches win", () => {
  assert.deepEqual(
    mergeVideoThemePatches(
      { other: { video: { a: 1, b: 1 } } },
      { other: { video: { b: 2 } } },
    ),
    { other: { video: { a: 1, b: 2 } } },
  );
});

test("an object replaces a reference instead of merging into it", () => {
  assert.deepEqual(
    mergeVideoThemePatches(
      { other: { box: "$atomic.box.md" } },
      { other: { box: { width: 2 } } },
    ),
    { other: { box: { width: 2 } } },
  );
});

test("no patches merge to an empty patch", () => {
  assert.deepEqual(mergeVideoThemePatches(), {});
});
