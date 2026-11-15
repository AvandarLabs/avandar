import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromLibrary } from "../makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { createThemePatchFromStockColors } from "./createThemePatchFromStockColors";
import type { VideoThemePatch } from "../videoTheme.types";

function _classicWith(patch: VideoThemePatch) {
  return makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic", {
    patches: [patch],
  });
}

test("a picked stock accent becomes the accent swatch", () => {
  assert.equal(
    _classicWith(createThemePatchFromStockColors({ accent: "#ff0000" }))
      .semantic.color.accent,
    "#ff0000",
  );
});

test("a picked stock background becomes the ground swatch", () => {
  assert.equal(
    _classicWith(createThemePatchFromStockColors({ background: "#f8fafc" }))
      .semantic.color.ground,
    "#f8fafc",
  );
});

test("no colours make an empty patch that changes nothing", () => {
  assert.equal(
    _classicWith(createThemePatchFromStockColors({})).hash,
    makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic").hash,
  );
});
