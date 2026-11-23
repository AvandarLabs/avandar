import assert from "node:assert/strict";
import test from "node:test";
import { makeResolvedVideoThemeFromLibrary } from "../makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { makeThemePatchFromStockColors } from "../makeThemePatchFromStockColors/makeThemePatchFromStockColors";
import { BUILT_IN_VIDEO_THEMES } from "../makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import type { VideoThemePatch } from "../videoTheme.types";

function _classicWith(patch: VideoThemePatch) {
  return makeResolvedVideoThemeFromLibrary({
    library: BUILT_IN_VIDEO_THEMES,
    themeId: "classic",
    scope: {
      patches: [patch],
    },
  });
}
test("a picked stock accent becomes the accent swatch", () => {
  assert.equal(
    _classicWith(makeThemePatchFromStockColors({ accent: "#ff0000" })).semantic
      .color.accent,
    "#ff0000",
  );
});
test("a picked stock background becomes the ground swatch", () => {
  assert.equal(
    _classicWith(makeThemePatchFromStockColors({ background: "#f8fafc" }))
      .semantic.color.ground,
    "#f8fafc",
  );
});
test("no colours make an empty patch that changes nothing", () => {
  assert.equal(
    _classicWith(makeThemePatchFromStockColors({})).hash,
    makeResolvedVideoThemeFromLibrary({
      library: BUILT_IN_VIDEO_THEMES,
      themeId: "classic",
    }).hash,
  );
});
