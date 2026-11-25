import assert from "node:assert/strict";
import test from "node:test";
import { propEq, propNotEq } from "@avandar/utils";
import { getResolvedTokenValue } from "../../../videoTheme/getResolvedTokenValue";
import {
  BUILT_IN_VIDEO_THEMES,
  makeVideoThemeLibraryFromDocuments,
} from "../../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { DraftThemeResolution } from "../../DraftThemeResolution/DraftThemeResolution";
import {
  EMPTY_THEME_DRAFT,
  type ThemeDraft,
  type ThemeEditScope,
  ThemeDrafts,
} from "../../ThemeDrafts/ThemeDrafts";
import { TokenRows } from "../TokenRows";
import { type TokenRow } from "../TokenRows.types";
import type { makeResolvedVideoThemeFromLibrary } from "../../../videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
} from "../../../videoTheme/videoTheme.types";
/** Provides a built-in theme with an item override for draft row assertions. */
function _getClassicWithItemOverride(): VideoThemeLibrary {
  return new Map<string, VideoThemeDocument>([
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
}

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
const ITEM: ThemeEditScope = { kind: "item", itemId: "network-graph" };
function _rows({
  scope,
  draft = EMPTY_THEME_DRAFT,
}: Readonly<{
  scope: ThemeEditScope;
  draft?: ThemeDraft;
}>): readonly TokenRow[] {
  const resolved = DraftThemeResolution.makeDraftThemeResultFromDraft({
    library: LIBRARY,
    themeId: "studio",
    draft,
    scope,
  });
  if (!resolved.ok) {
    throw new Error("The test theme must resolve");
  }
  return TokenRows.listTokenRows({
    library: LIBRARY,
    themeId: "studio",
    draft,
    scope,
    merged: resolved.merged,
    theme: resolved.theme,
  });
}
function _row({
  rows,
  path,
}: Readonly<{
  rows: readonly TokenRow[];
  path: string;
}>): TokenRow | undefined {
  return rows.find(propEq("path", path));
}
test("a row's issue is one at its path or inside it, never a sibling's", () => {
  const issues = [
    { path: "color.accentSoft", message: "sibling" },
    { path: "text.stage.title.color", message: "inside" },
  ];
  assert.equal(
    TokenRows.findTokenRowIssue({ issues, tokenPath: "color.accent" }),
    undefined,
  );
  assert.equal(
    TokenRows.findTokenRowIssue({ issues, tokenPath: "text.stage.title" })
      ?.message,
    "inside",
  );
  assert.equal(
    TokenRows.findTokenRowIssue({ issues, tokenPath: "color.accentSoft" })
      ?.message,
    "sibling",
  );
});
test("a new scale value takes the first free custom key in its whole scale", () => {
  const draft = ThemeDrafts.setTokenInDraft({
    draft: ThemeDrafts.setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: { kind: "theme" },
      tokenPath: "atomic.swatch.custom1",
      value: "#123456",
    }),
    scope: { kind: "theme" },
    tokenPath: "atomic.swatch.custom3",
    value: "#654321",
  });
  const rows = _rows({
    scope: { kind: "theme" },
    draft,
  });
  const visible = TokenRows.filterTokenRows({
    rows,
    filter: {
      tiers: ["atomic"],
      query: "mint",
      getText: () => {
        return "";
      },
    },
  });
  assert.ok(!visible.some(propEq("scaleKey", "custom1")));
  assert.equal(
    TokenRows.makeNextCustomScaleKeyFromRows({ rows, group: "atomic:swatch" }),
    "custom2",
  );
  assert.equal(
    TokenRows.makeNextCustomScaleKeyFromRows({
      rows,
      group: "atomic:textShadow",
    }),
    "custom1",
  );
});
test("a reference to a token that does not exist is a missing reference", () => {
  assert.deepEqual(
    TokenRows.describeRowIssue({
      path: "color.accent",
      message: "$atomic.swatch.missingSwatch does not point at a token",
    }),
    { kind: "missingReference", reference: "$atomic.swatch.missingSwatch" },
  );
});
test("a reference cycle is reported as a loop", () => {
  assert.deepEqual(
    TokenRows.describeRowIssue({
      path: "color.accent",
      message: "Reference cycle: $color.accent → $color.text → $color.accent",
    }),
    { kind: "loop" },
  );
});
test("any other resolver message is a general problem", () => {
  assert.deepEqual(
    TokenRows.describeRowIssue({
      path: "stroke.default",
      message: "Expected a length",
    }),
    { kind: "other" },
  );
});
function _themeRowsWithItem(draft: ThemeDraft): {
  rows: ReturnType<typeof TokenRows.listTokenRows>;
  itemTheme: ReturnType<typeof makeResolvedVideoThemeFromLibrary>;
} {
  const input = { library: LIBRARY, themeId: "studio", draft };
  const themeResult = DraftThemeResolution.makeDraftThemeResultFromDraft({
    ...input,
    scope: { kind: "theme" },
  });
  const itemResult = DraftThemeResolution.makeDraftThemeResultFromDraft({
    ...input,
    scope: ITEM,
  });
  if (!themeResult.ok || !itemResult.ok) {
    throw new Error("The test theme must resolve");
  }
  const rows = TokenRows.listTokenRows({
    ...input,
    scope: { kind: "theme" },
    merged: themeResult.merged,
    theme: themeResult.theme,
    item: { id: "network-graph", theme: itemResult.theme },
  });
  return { rows, itemTheme: itemResult.theme };
}
test("in theme scope, a row the previewed item overrides carries the item's own value", () => {
  const { rows, itemTheme } = _themeRowsWithItem(EMPTY_THEME_DRAFT);
  const accent = _row({
    rows,
    path: "color.accent",
  });
  assert.ok(accent?.itemOverride);
  assert.notEqual(accent.itemOverride.resolved, accent.resolved);
  assert.equal(
    accent.itemOverride.resolved,
    getResolvedTokenValue({
      theme: itemTheme,
      path: "color.accent",
    }),
  );
  assert.equal(
    _row({
      rows,
      path: "color.line",
    })?.itemOverride,
    undefined,
  );
});
test("in theme scope, an unsaved item edit also counts as the item's own value", () => {
  const draft = ThemeDrafts.setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: ITEM,
    tokenPath: "stroke.default",
    value: "$atomic.strokeWidth.lg",
  });
  const { rows } = _themeRowsWithItem(draft);
  assert.ok(
    _row({
      rows,
      path: "stroke.default",
    })?.itemOverride,
  );
});
test("item-scope rows never carry an item override, since their state says it", () => {
  assert.equal(
    _rows({ scope: ITEM }).filter(propNotEq("itemOverride", undefined)).length,
    0,
  );
});
