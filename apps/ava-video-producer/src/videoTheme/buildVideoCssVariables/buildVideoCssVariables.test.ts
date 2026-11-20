import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromLibrary } from "../makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { buildVideoCssVariables } from "./buildVideoCssVariables";

const variables = buildVideoCssVariables(
  makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic"),
);

test("semantic colours become video variables", () => {
  assert.equal(variables["--video-color-ground"], "#0b1219");
  assert.equal(variables["--video-color-ground-fill"], "#0b1219");
});

test("type styles expand into font variables in pixels and ems", () => {
  assert.equal(variables["--video-text-stage-heading-font-size"], "48px");
  assert.equal(
    variables["--video-text-stage-heading-letter-spacing"],
    "-0.025em",
  );
  assert.equal(
    variables["--video-text-stage-heading-font-family"],
    "Figtree, ui-sans-serif, system-ui, sans-serif",
  );
});

test("elevations become a box shadow and a drop-shadow filter", () => {
  assert.equal(
    variables["--video-elevation-floating-box-shadow"],
    "0px 16px 22px 0px #06101455",
  );
  assert.equal(
    variables["--video-elevation-floating-drop-shadow"],
    "drop-shadow(0px 16px 22px #06101455)",
  );
});

test("layout boxes become one variable per side", () => {
  assert.equal(variables["--video-layout-stage-graphic-inset-x"], "60px");
  assert.equal(variables["--video-layout-stage-graphic-inset-top"], "192px");
  assert.equal(variables["--video-layout-stage-graphic-inset-bottom"], "70px");
});

test("motion, camera, and sketch tokens produce no variables", () => {
  assert.ok(
    Object.keys(variables).every((name) => {
      return !/^--video-(motion|camera|motion-blur|sketch)-/.test(name);
    }),
  );
});

test("component tokens are namespaced by component", () => {
  assert.equal(variables["--video-component-progress-bar-height"], "3px");
  assert.equal(variables["--video-component-progress-bar-paint"], "#51a7ff");
});

test("the scene palette is emitted under the names storyboard scenes read", () => {
  assert.deepEqual(
    [
      variables["--brand"],
      variables["--muted-foreground"],
      variables["--ground"],
    ],
    ["#5d90ff", "#99a6b8", "#03050e"],
  );
});

test("an unset scene shadow emits nothing, so a scene keeps its fallback", () => {
  assert.equal("--shadow" in variables, false);
});
