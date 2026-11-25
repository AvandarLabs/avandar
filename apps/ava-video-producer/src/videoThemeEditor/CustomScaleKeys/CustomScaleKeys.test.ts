import assert from "node:assert/strict";
import test from "node:test";
import { CustomScaleKeys } from "./CustomScaleKeys";

test("a generated custom scale key is recognised", () => {
  assert.equal(CustomScaleKeys.isCustomScaleKey("customColorAccent"), true);
  assert.equal(CustomScaleKeys.isCustomScaleKey("custom"), false);
  assert.equal(CustomScaleKeys.isCustomScaleKey("customize"), false);
  assert.equal(CustomScaleKeys.isCustomScaleKey("mint"), false);
  assert.equal(CustomScaleKeys.isCustomScaleKey(undefined), false);
});

test("a custom entry path ends in a generated key inside a scale", () => {
  assert.equal(
    CustomScaleKeys.isCustomScaleEntryPath("atomic.swatch.customColorAccent"),
    true,
  );
  assert.equal(
    CustomScaleKeys.isCustomScaleEntryPath(
      "fontSizes.customTextStageTitleSize",
    ),
    true,
  );
  assert.equal(
    CustomScaleKeys.isCustomScaleEntryPath("atomic.swatch.mint"),
    false,
  );
  assert.equal(CustomScaleKeys.isCustomScaleEntryPath("color.accent"), false);
  assert.equal(
    CustomScaleKeys.isCustomScaleEntryPath("customColorAccent"),
    false,
  );
});

test("a camelCase scale key reads as lowercase words", () => {
  assert.equal(CustomScaleKeys.humanizeScaleKey("textDark"), "text dark");
  assert.equal(
    CustomScaleKeys.humanizeScaleKey("customColorAccent"),
    "custom color accent",
  );
  assert.equal(CustomScaleKeys.humanizeScaleKey("mint"), "mint");
  assert.equal(CustomScaleKeys.humanizeScaleKey("7xl"), "7xl");
  assert.equal(CustomScaleKeys.humanizeScaleKey("6"), "6");
});
