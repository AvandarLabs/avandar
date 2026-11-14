import assert from "node:assert/strict";
import test from "node:test";
import {
  humanizeScaleKey,
  isCustomScaleEntryPath,
  isCustomScaleKey,
} from "./customScaleKey";

test("a generated custom scale key is recognised", () => {
  assert.equal(isCustomScaleKey("customColorAccent"), true);
  assert.equal(isCustomScaleKey("custom"), false);
  assert.equal(isCustomScaleKey("customize"), false);
  assert.equal(isCustomScaleKey("mint"), false);
  assert.equal(isCustomScaleKey(undefined), false);
});

test("a custom entry path ends in a generated key inside a scale", () => {
  assert.equal(isCustomScaleEntryPath("atomic.swatch.customColorAccent"), true);
  assert.equal(
    isCustomScaleEntryPath("fontSizes.customTextStageTitleSize"),
    true,
  );
  assert.equal(isCustomScaleEntryPath("atomic.swatch.mint"), false);
  assert.equal(isCustomScaleEntryPath("color.accent"), false);
  assert.equal(isCustomScaleEntryPath("customColorAccent"), false);
});

test("a camelCase scale key reads as lowercase words", () => {
  assert.equal(humanizeScaleKey("textDark"), "text dark");
  assert.equal(humanizeScaleKey("customColorAccent"), "custom color accent");
  assert.equal(humanizeScaleKey("mint"), "mint");
  assert.equal(humanizeScaleKey("7xl"), "7xl");
  assert.equal(humanizeScaleKey("6"), "6");
});
