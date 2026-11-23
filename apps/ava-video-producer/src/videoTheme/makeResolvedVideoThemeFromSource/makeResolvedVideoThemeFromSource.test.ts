import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromSource } from "./makeResolvedVideoThemeFromSource";

test("one source resolves to the same theme object every time", () => {
  assert.equal(
    makeResolvedVideoThemeFromSource(DEFAULT_VIDEO_THEME_SOURCE),
    makeResolvedVideoThemeFromSource(DEFAULT_VIDEO_THEME_SOURCE),
  );
});
