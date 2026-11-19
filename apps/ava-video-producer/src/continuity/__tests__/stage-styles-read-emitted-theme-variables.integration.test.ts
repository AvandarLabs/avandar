/*
 * The continuity CSS modules read only `--video-*` variables the theme
 * actually emits, so a typo or a renamed token cannot silently fall back to
 * the browser default.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { buildVideoCssVariables } from "../../videoTheme/buildVideoCssVariables/buildVideoCssVariables";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromLibrary } from "../../videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";

const STYLE_FILES = [
  "../ContinuityScene.module.css",
  "../ContinuityOverlays.module.css",
];

test("every required theme variable in the stage styles is emitted by every built-in theme", async () => {
  const css = (
    await Promise.all(
      STYLE_FILES.map((file) => {
        return fs.readFile(new URL(file, import.meta.url), "utf8");
      }),
    )
  ).join("\n");
  const required = new Set(
    [...css.matchAll(/var\((--video-[a-z0-9-]+)\)/g)].map((match) => {
      return match[1];
    }),
  );
  [...BUILT_IN_VIDEO_THEMES.keys()].forEach((themeId) => {
    const emitted = buildVideoCssVariables(
      makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, themeId),
    );
    assert.deepEqual(
      [...required].filter((name) => {
        return !(name in emitted);
      }),
      [],
      themeId,
    );
  });
});
