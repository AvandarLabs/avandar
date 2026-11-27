import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import {
  BUILT_IN_VIDEO_THEMES,
  makeVideoThemeLibraryFromDocuments,
} from "../../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { DraftThemeResolution } from "../../DraftThemeResolution/DraftThemeResolution";
import {
  EMPTY_THEME_DRAFT,
  ThemeDrafts,
  type ThemeDraft,
  type ThemeEditScope,
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
test("every catalog token gets a row, with one row per scale entry", () => {
  const rows = _rows({ scope: { kind: "theme" } });
  for (const path of [
    "atomic.swatch.mint",
    "color.accent",
    "components.ProgressBar.height",
    "colors.primary",
  ]) {
    assert.ok(
      _row({
        rows,
        path,
      }),
      path,
    );
  }
  assert.equal(
    _row({
      rows,
      path: "atomic.swatch",
    }),
    undefined,
  );
});
test("rows group by tier and first segment", () => {
  const rows = _rows({ scope: { kind: "theme" } });
  assert.deepEqual(
    [
      "color.accent",
      "atomic.swatch.mint",
      "fontSizes.md",
      "components.ProgressBar.height",
    ].map((path) => {
      return _row({
        rows,
        path,
      })?.group;
    }),
    [
      "semantic:color",
      "atomic:swatch",
      "mantine:type",
      "component:ProgressBar",
    ],
  );
});
test("item-scope rows tell draft edits from saved overrides", () => {
  const draft = ThemeDrafts.setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: ITEM,
    tokenPath: "stroke.default",
    value: "$atomic.strokeWidth.lg",
  });
  const rows = _rows({
    scope: ITEM,
    draft,
  });
  assert.deepEqual(
    ["color.accent", "stroke.default", "color.line"].map((path) => {
      return _row({
        rows,
        path,
      })?.overrideState;
    }),
    ["saved", "draft", "none"],
  );
});
test("on a built-in theme with a draft, item rows show no saved overrides", () => {
  const library = _getClassicWithItemOverride();
  const draft = ThemeDrafts.setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: { kind: "theme" },
    tokenPath: "stroke.default",
    value: "$atomic.strokeWidth.lg",
  });
  const resolved = DraftThemeResolution.makeDraftThemeResultFromDraft({
    library,
    themeId: "classic",
    draft,
    scope: ITEM,
  });
  if (!resolved.ok) {
    throw new Error("The test theme must resolve");
  }
  const rows = TokenRows.listTokenRows({
    library,
    themeId: "classic",
    draft,
    scope: ITEM,
    merged: resolved.merged,
    theme: resolved.theme,
  });
  assert.equal(
    _row({
      rows,
      path: "color.accent",
    })?.overrideState,
    "none",
  );
});
test("the used filter keeps atomic rows and drops unused semantic rows", () => {
  const filtered = TokenRows.filterTokenRows({
    rows: _rows({ scope: { kind: "theme" } }),
    filter: {
      tiers: ["semantic", "atomic"],
      query: "",
      usedTokens: ["color.accent"],
      getText: () => {
        return "";
      },
    },
  });
  assert.ok(filtered.some(propEq("path", "color.accent")));
  assert.ok(filtered.some(propEq("path", "atomic.swatch.mint")));
  assert.ok(!filtered.some(propEq("path", "color.line")));
});
test("search matches a row's text or its path", () => {
  const filtered = TokenRows.filterTokenRows({
    rows: _rows({ scope: { kind: "theme" } }),
    filter: {
      tiers: ["semantic"],
      query: "corner.pill",
      getText: () => {
        return "";
      },
    },
  });
  assert.deepEqual(filtered.map(prop("path")), ["corner.pill"]);
});
test("Essentials come out in their fixed order", () => {
  assert.deepEqual(
    TokenRows.getEssentialRows(_rows({ scope: { kind: "theme" } })).map(
      prop("path"),
    ),
    [
      "color.accent",
      "color.ground",
      "color.text",
      "atomic.fontFamily.figtree",
      "stroke.default",
      "stroke.scale",
      "corner.panel",
      "corner.scale",
      "elevation.strength",
      "alpha.washScale",
      "motion.tempo",
      "motion.easingProfile",
      "motion.staggerScale",
      "motion.entranceStyle",
      "motion.loopFade.graphic",
      "sketch.box",
      "sketch.shape",
      "sketch.annotation",
      ...Array.from({ length: 9 }, (_, index) => {
        return `color.categorical.${index + 1}`;
      }),
    ],
  );
});
test("every Look and feel option starts at its identity value", () => {
  const rows = _rows({ scope: { kind: "theme" } });
  const resolvedAt = (path: string) => {
    return rows.find(propEq("path", path))?.resolved;
  };
  assert.deepEqual(
    [
      "stroke.scale",
      "corner.scale",
      "elevation.strength",
      "alpha.washScale",
      "motion.staggerScale",
      "motion.easingProfile",
      "motion.entranceStyle",
    ].map(resolvedAt),
    [1, 1, 1, 1, 1, "authored", "rise"],
  );
});
test("atomic scales with no entries still get a section", () => {
  assert.deepEqual(
    TokenRows.listEmptyAtomicScaleGroups(_rows({ scope: { kind: "theme" } })),
    ["atomic:size", "atomic:textShadow"],
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
