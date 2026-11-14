import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { EMPTY_THEME_DRAFT, setTokenInDraft } from "../themeDraft/themeDraft";
import { isThemeDraftValid, resolveDraftTheme } from "./resolveDraftTheme";
import type { VideoThemeDocument } from "../../videoTheme/videoTheme.types";

const STUDIO: VideoThemeDocument = {
  schemaVersion: 1,
  id: "studio",
  label: "Studio",
  extends: "classic",
  overrides: {
    "network-graph": {
      other: {
        video: { semantic: { color: { accent: "$atomic.swatch.orange" } } },
      },
    },
  },
};
const LIBRARY = createVideoThemeLibrary([STUDIO]);
const THEME = { kind: "theme" } as const;

test("an unedited theme resolves with no patches", () => {
  const result = resolveDraftTheme({
    library: LIBRARY,
    themeId: "studio",
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
  });
  assert.equal(result.ok && result.patches.length, 0);
});

test("a draft reference to a missing token reports the token path", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    THEME,
    "color.accent",
    "$atomic.swatch.nope",
  );
  const result = resolveDraftTheme({
    library: LIBRARY,
    themeId: "studio",
    draft,
    scope: THEME,
  });
  // The resolver also reports each token that reaches the missing one through
  // a reference, such as `text.stage.sharedObject.color`.
  assert.ok(
    !result.ok &&
      result.issues.map((issue) => issue.path).includes("color.accent"),
  );
});

test("a draft value that breaks the schema reports the token path", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    THEME,
    "color.accent",
    "#ff0000",
  );
  const result = resolveDraftTheme({
    library: LIBRARY,
    themeId: "studio",
    draft,
    scope: THEME,
  });
  assert.ok(
    !result.ok &&
      result.issues.some((issue) => issue.path.startsWith("color.accent")),
  );
});

test("item scope resolves the item's saved override", () => {
  const result = resolveDraftTheme({
    library: LIBRARY,
    themeId: "studio",
    draft: EMPTY_THEME_DRAFT,
    scope: { kind: "item", itemId: "network-graph" },
  });
  assert.equal(result.ok && result.theme.semantic.color.accent, "#f0ba83");
});

test("a built-in theme with a draft resolves without its per-item overrides", () => {
  const library = new Map<string, VideoThemeDocument>([
    ...BUILT_IN_VIDEO_THEMES,
    [
      "classic",
      {
        ...(BUILT_IN_VIDEO_THEMES.get("classic") as VideoThemeDocument),
        overrides: {
          "network-graph": {
            other: {
              video: {
                semantic: { color: { accent: "$atomic.swatch.orange" } },
              },
            },
          },
        },
      },
    ],
  ]);
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    THEME,
    "stroke.default",
    "$atomic.strokeWidth.lg",
  );
  const result = resolveDraftTheme({
    library,
    themeId: "classic",
    draft,
    scope: { kind: "item", itemId: "network-graph" },
  });
  assert.ok(result.ok && result.theme.semantic.color.accent !== "#f0ba83");
});

test("a draft with a broken item override is not valid", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    { kind: "item", itemId: "data-pipeline" },
    "color.line",
    "$atomic.swatch.nope",
  );
  assert.equal(
    isThemeDraftValid({ library: LIBRARY, themeId: "studio", draft }),
    false,
  );
});
