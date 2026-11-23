import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import {
  BUILT_IN_VIDEO_THEMES,
  makeVideoThemeLibraryFromDocuments,
} from "../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { EMPTY_THEME_DRAFT, ThemeDrafts } from "../ThemeDrafts/ThemeDrafts";
import { DraftThemeResolution } from "./DraftThemeResolution";
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

const LIBRARY = makeVideoThemeLibraryFromDocuments([STUDIO]);

const THEME = { kind: "theme" } as const;

test("an unedited theme resolves with no patches", () => {
  const result = DraftThemeResolution.makeDraftThemeResultFromDraft({
    library: LIBRARY,
    themeId: "studio",
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
  });
  assert.equal(result.ok && result.patches.length, 0);
});

test("a draft reference to a missing token reports the token path", () => {
  const draft = ThemeDrafts.setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "color.accent",
    value: "$atomic.swatch.nope",
  });
  const result = DraftThemeResolution.makeDraftThemeResultFromDraft({
    library: LIBRARY,
    themeId: "studio",
    draft,
    scope: THEME,
  });
  // The resolver also reports each token that reaches the missing one through
  // a reference, such as `text.stage.sharedObject.color`.
  assert.ok(
    !result.ok && result.issues.map(prop("path")).includes("color.accent"),
  );
});

test("a draft value that breaks the schema reports the token path", () => {
  const draft = ThemeDrafts.setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "color.accent",
    value: "#ff0000",
  });
  const result = DraftThemeResolution.makeDraftThemeResultFromDraft({
    library: LIBRARY,
    themeId: "studio",
    draft,
    scope: THEME,
  });
  assert.ok(
    !result.ok &&
      result.issues.some((issue) => {
        return issue.path.startsWith("color.accent");
      }),
  );
});

test("item scope resolves the item's saved override", () => {
  const result = DraftThemeResolution.makeDraftThemeResultFromDraft({
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
        ...BUILT_IN_VIDEO_THEMES.get("classic")!,
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
  const draft = ThemeDrafts.setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "stroke.default",
    value: "$atomic.strokeWidth.lg",
  });
  const result = DraftThemeResolution.makeDraftThemeResultFromDraft({
    library,
    themeId: "classic",
    draft,
    scope: { kind: "item", itemId: "network-graph" },
  });
  assert.ok(result.ok && result.theme.semantic.color.accent !== "#f0ba83");
});

test("a draft with a broken item override is not valid", () => {
  const draft = ThemeDrafts.setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: { kind: "item", itemId: "data-pipeline" },
    tokenPath: "color.line",
    value: "$atomic.swatch.nope",
  });
  assert.equal(
    DraftThemeResolution.isThemeDraftValid({
      library: LIBRARY,
      themeId: "studio",
      draft,
    }),
    false,
  );
});

const FIRST_DRAFT = ThemeDrafts.setTokenInDraft({
  draft: EMPTY_THEME_DRAFT,
  scope: THEME,
  tokenPath: "atomic.swatch.mint",
  value: "#123456",
});

const SECOND_DRAFT = ThemeDrafts.setTokenInDraft({
  draft: EMPTY_THEME_DRAFT,
  scope: THEME,
  tokenPath: "atomic.swatch.mint",
  value: "#654321",
});

test("a valid draft becomes the last valid one", () => {
  assert.deepEqual(
    DraftThemeResolution.nextLastValidDraft({
      current: undefined,
      themeId: "studio",
      draft: FIRST_DRAFT,
      isValid: true,
    }),
    { themeId: "studio", draft: FIRST_DRAFT },
  );
});

test("an invalid draft leaves the last valid one in place", () => {
  const current = { themeId: "studio", draft: FIRST_DRAFT };
  assert.equal(
    DraftThemeResolution.nextLastValidDraft({
      current,
      themeId: "studio",
      draft: SECOND_DRAFT,
      isValid: false,
    }),
    current,
  );
});

test("the same valid draft keeps the same record, so no re-render is requested", () => {
  const current = { themeId: "studio", draft: FIRST_DRAFT };
  assert.equal(
    DraftThemeResolution.nextLastValidDraft({
      current,
      themeId: "studio",
      draft: FIRST_DRAFT,
      isValid: true,
    }),
    current,
  );
});

test("a valid draft for another theme replaces the last valid one", () => {
  const current = { themeId: "studio", draft: FIRST_DRAFT };
  assert.deepEqual(
    DraftThemeResolution.nextLastValidDraft({
      current,
      themeId: "classic",
      draft: FIRST_DRAFT,
      isValid: true,
    }),
    { themeId: "classic", draft: FIRST_DRAFT },
  );
});
