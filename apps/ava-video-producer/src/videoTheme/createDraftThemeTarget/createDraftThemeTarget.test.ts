import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromLibrary } from "../makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import {
  createDraftThemeTarget,
  DRAFT_THEME_ID,
} from "./createDraftThemeTarget";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
} from "../videoTheme.types";

const ORANGE_ACCENT = {
  other: {
    video: { semantic: { color: { accent: "$atomic.swatch.orange" } } },
  },
};
const CLASSIC = BUILT_IN_VIDEO_THEMES.get("classic")!;

/**
 * Classic with a per-item accent override, like the accents classic authors per
 * composition, plus a custom theme.
 */
const LIBRARY: VideoThemeLibrary = new Map<string, VideoThemeDocument>([
  ...createVideoThemeLibrary([
    { schemaVersion: 1, id: "warm", label: "Warm", extends: "classic" },
  ]),
  ["classic", { ...CLASSIC, overrides: { "network-graph": ORANGE_ACCENT } }],
]);

test("a custom theme is its own target", () => {
  const target = createDraftThemeTarget({
    library: LIBRARY,
    themeId: "warm",
    hasDraft: true,
  });
  assert.equal(target.library, LIBRARY);
  assert.equal(target.themeId, "warm");
});

test("a built-in theme without a draft is its own target", () => {
  assert.equal(
    createDraftThemeTarget({
      library: LIBRARY,
      themeId: "classic",
      hasDraft: false,
    }).themeId,
    "classic",
  );
});

test("a built-in theme with a draft becomes an unsaved theme that extends it", () => {
  const target = createDraftThemeTarget({
    library: LIBRARY,
    themeId: "classic",
    hasDraft: true,
  });
  assert.equal(target.themeId, DRAFT_THEME_ID);
  assert.deepEqual(target.library.get(DRAFT_THEME_ID), {
    schemaVersion: 1,
    id: DRAFT_THEME_ID,
    label: "Classic",
    extends: "classic",
  });
});

test("the unsaved theme does not inherit the built-in's per-item overrides", () => {
  const scope = { overrideIds: ["network-graph"] };
  const target = createDraftThemeTarget({
    library: LIBRARY,
    themeId: "classic",
    hasDraft: true,
  });
  assert.equal(
    makeResolvedVideoThemeFromLibrary(LIBRARY, "classic", scope).semantic.color
      .accent,
    "#f0ba83",
  );
  assert.notEqual(
    makeResolvedVideoThemeFromLibrary(target.library, target.themeId, scope)
      .semantic.color.accent,
    "#f0ba83",
  );
});
