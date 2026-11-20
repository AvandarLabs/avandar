import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromLibrary } from "../../../videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import {
  contentColorSchema,
  getContentColorFromValue,
} from "./getContentColorFromValue";

const tokens = makeResolvedVideoThemeFromLibrary(
  BUILT_IN_VIDEO_THEMES,
  "classic",
).semantic;

test("a colour role in content resolves through the theme", () => {
  assert.equal(
    getContentColorFromValue("$color.accentAlt", { tokens, accent: "#51a7ff" }),
    "#82c8f2",
  );
});

test("the legacy accent keyword resolves to the graphic's accent", () => {
  assert.equal(
    getContentColorFromValue("accent", { tokens, accent: "#ff0000" }),
    "#ff0000",
  );
});

test("a literal hex is a deliberate bypass of the theme", () => {
  assert.equal(
    getContentColorFromValue("#123456", { tokens, accent: "#51a7ff" }),
    "#123456",
  );
});

test("content accepts colour roles but not other references", () => {
  assert.equal(contentColorSchema.safeParse("$color.highlight").success, true);
  assert.equal(
    contentColorSchema.safeParse("$atomic.swatch.mint").success,
    false,
  );
  assert.equal(
    contentColorSchema.safeParse("$color.groundFill").success,
    false,
  );
});

test("a nested role such as a category colour resolves through the theme", () => {
  assert.deepEqual(
    [
      contentColorSchema.safeParse("$color.categorical.4").success,
      getContentColorFromValue("$color.categorical.4", {
        tokens,
        accent: "#51a7ff",
      }),
    ],
    [true, "#df95aa"],
  );
});
