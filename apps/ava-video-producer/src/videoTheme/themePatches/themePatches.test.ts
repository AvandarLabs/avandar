import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";
import { videoThemePatchSchema } from "../videoThemeSchema/videoThemeSchema";
import {
  createThemePatchFromLegacyAppearance,
  createThemePatchFromStockColors,
} from "./themePatches";
import type { VideoThemePatch } from "../videoTheme.types";

function _classicWith(patch: VideoThemePatch) {
  return resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", {
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
    resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic").hash,
  );
});

test("legacy roughness sets the annotation and box sketch profiles", () => {
  const theme = _classicWith(
    createThemePatchFromLegacyAppearance({
      annotationRoughness: 0.5,
      boxRoughness: 3,
    }),
  );
  assert.deepEqual(
    [
      theme.semantic.sketch.annotation.roughness,
      theme.semantic.sketch.box.roughness,
    ],
    [0.5, 3],
  );
});

test("a legacy camera preset becomes the theme camera preset", () => {
  assert.equal(
    _classicWith(createThemePatchFromLegacyAppearance({ cameraPreset: "whip" }))
      .semantic.camera.preset,
    "whip",
  );
});

test("legacy patches are valid theme patches", () => {
  const patch = createThemePatchFromLegacyAppearance({
    accent: "#123456",
    background: "#abcdef",
    annotationRoughness: 1,
    boxRoughness: 0,
    cameraPreset: "gentle",
  });
  assert.equal(videoThemePatchSchema.safeParse(patch).success, true);
});
