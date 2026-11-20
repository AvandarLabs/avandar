import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromLibrary } from "../../../videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { makeThemePatchesFromTheme } from "./makeThemePatchesFromTheme";
import type { ShotTheme } from "../../schema/themeSchema";

function _getSceneColorsFromThemes(...themes: readonly ShotTheme[]) {
  return makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic", {
    patches: themes.flatMap((theme) => {
      return makeThemePatchesFromTheme(theme);
    }),
  }).semantic.color.scene;
}

test("storyboard theme names become scene palette tokens", () => {
  assert.deepEqual(
    makeThemePatchesFromTheme({
      "muted-foreground": "$atomic.swatch.slate500",
      ground: "var(--brand)",
      brand: "#1563fe",
    }),
    [
      {
        other: {
          video: {
            semantic: {
              color: {
                scene: {
                  mutedForeground: "$atomic.swatch.slate500",
                  ground: "$color.scene.brand",
                  brand: "#1563fe",
                },
              },
            },
          },
        },
      },
    ],
  );
});

test("a missing or empty theme adds no patch", () => {
  assert.deepEqual(makeThemePatchesFromTheme(undefined), []);
  assert.deepEqual(makeThemePatchesFromTheme({}), []);
});

test("a shot reference reads the scene palette the plan and theme set", () => {
  const scene = _getSceneColorsFromThemes(
    { brand: "#1563fe" },
    { ground: "var(--brand)", foreground: "$atomic.swatch.slate900" },
  );
  assert.equal(scene.ground, "#1563fe");
  assert.equal(scene.foreground, "#0f172a");
});
