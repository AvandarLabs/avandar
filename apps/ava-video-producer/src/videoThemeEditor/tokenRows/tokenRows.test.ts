import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { getResolvedTokenValue } from "../../videoTheme/getResolvedTokenValue/getResolvedTokenValue";
import { resolveDraftTheme } from "../resolveDraftTheme/resolveDraftTheme";
import {
  EMPTY_THEME_DRAFT,
  setTokenInDraft,
  type ThemeDraft,
  type ThemeEditScope,
} from "../themeDraft/themeDraft";
import {
  buildNextCustomScaleKey,
  describeRowIssue,
  filterTokenRows,
  findTokenRowIssue,
  getEssentialRows,
  listEmptyAtomicScaleGroups,
  listTokenRows,
  type TokenRow,
} from "./tokenRows";
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
const ITEM: ThemeEditScope = { kind: "item", itemId: "network-graph" };

function _rows(
  scope: ThemeEditScope,
  draft: ThemeDraft = EMPTY_THEME_DRAFT,
): readonly TokenRow[] {
  const resolved = resolveDraftTheme({
    library: LIBRARY,
    themeId: "studio",
    draft,
    scope,
  });
  if (!resolved.ok) {
    throw new Error("The test theme must resolve");
  }
  return listTokenRows({
    library: LIBRARY,
    themeId: "studio",
    draft,
    scope,
    merged: resolved.merged,
    theme: resolved.theme,
  });
}

function _row(rows: readonly TokenRow[], path: string): TokenRow | undefined {
  return rows.find((row) => row.path === path);
}

test("every catalog token gets a row, with one row per scale entry", () => {
  const rows = _rows({ kind: "theme" });
  for (const path of [
    "atomic.swatch.mint",
    "color.accent",
    "components.ProgressBar.height",
    "colors.primary",
  ]) {
    assert.ok(_row(rows, path), path);
  }
  assert.equal(_row(rows, "atomic.swatch"), undefined);
});

test("rows group by tier and first segment", () => {
  const rows = _rows({ kind: "theme" });
  assert.deepEqual(
    [
      "color.accent",
      "atomic.swatch.mint",
      "fontSizes.md",
      "components.ProgressBar.height",
    ].map((path) => _row(rows, path)?.group),
    [
      "semantic:color",
      "atomic:swatch",
      "mantine:type",
      "component:ProgressBar",
    ],
  );
});

test("item-scope rows tell draft edits from saved overrides", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    ITEM,
    "stroke.default",
    "$atomic.strokeWidth.lg",
  );
  const rows = _rows(ITEM, draft);
  assert.deepEqual(
    ["color.accent", "stroke.default", "color.line"].map(
      (path) => _row(rows, path)?.overrideState,
    ),
    ["saved", "draft", "none"],
  );
});

test("on a built-in theme with a draft, item rows show no saved overrides", () => {
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
    { kind: "theme" },
    "stroke.default",
    "$atomic.strokeWidth.lg",
  );
  const resolved = resolveDraftTheme({
    library,
    themeId: "classic",
    draft,
    scope: ITEM,
  });
  if (!resolved.ok) {
    throw new Error("The test theme must resolve");
  }
  const rows = listTokenRows({
    library,
    themeId: "classic",
    draft,
    scope: ITEM,
    merged: resolved.merged,
    theme: resolved.theme,
  });
  assert.equal(_row(rows, "color.accent")?.overrideState, "none");
});

test("the used filter keeps atomic rows and drops unused semantic rows", () => {
  const filtered = filterTokenRows(_rows({ kind: "theme" }), {
    tiers: ["semantic", "atomic"],
    query: "",
    usedTokens: ["color.accent"],
    getText: () => "",
  });
  assert.ok(filtered.some((row) => row.path === "color.accent"));
  assert.ok(filtered.some((row) => row.path === "atomic.swatch.mint"));
  assert.ok(!filtered.some((row) => row.path === "color.line"));
});

test("search matches a row's text or its path", () => {
  const filtered = filterTokenRows(_rows({ kind: "theme" }), {
    tiers: ["semantic"],
    query: "corner.pill",
    getText: () => "",
  });
  assert.deepEqual(
    filtered.map((row) => row.path),
    ["corner.pill"],
  );
});

test("Essentials come out in their fixed order", () => {
  assert.deepEqual(
    getEssentialRows(_rows({ kind: "theme" })).map((row) => row.path),
    [
      "color.accent",
      "color.ground",
      "color.text",
      "atomic.fontFamily.figtree",
      "stroke.default",
      "corner.panel",
      "motion.tempo",
      "sketch.box",
    ],
  );
});

test("atomic scales with no entries still get a section", () => {
  assert.deepEqual(listEmptyAtomicScaleGroups(_rows({ kind: "theme" })), [
    "atomic:size",
    "atomic:textShadow",
  ]);
});

test("a row's issue is one at its path or inside it, never a sibling's", () => {
  const issues = [
    { path: "color.accentSoft", message: "sibling" },
    { path: "text.stage.title.color", message: "inside" },
  ];
  assert.equal(findTokenRowIssue(issues, "color.accent"), undefined);
  assert.equal(
    findTokenRowIssue(issues, "text.stage.title")?.message,
    "inside",
  );
  assert.equal(
    findTokenRowIssue(issues, "color.accentSoft")?.message,
    "sibling",
  );
});

test("a new scale value takes the first free custom key in its whole scale", () => {
  const draft = setTokenInDraft(
    setTokenInDraft(
      EMPTY_THEME_DRAFT,
      { kind: "theme" },
      "atomic.swatch.custom1",
      "#123456",
    ),
    { kind: "theme" },
    "atomic.swatch.custom3",
    "#654321",
  );
  const rows = _rows({ kind: "theme" }, draft);
  const visible = filterTokenRows(rows, {
    tiers: ["atomic"],
    query: "mint",
    getText: () => "",
  });
  assert.ok(!visible.some((row) => row.scaleKey === "custom1"));
  assert.equal(buildNextCustomScaleKey(rows, "atomic:swatch"), "custom2");
  assert.equal(buildNextCustomScaleKey(rows, "atomic:textShadow"), "custom1");
});

test("a reference to a token that does not exist is a missing reference", () => {
  assert.deepEqual(
    describeRowIssue({
      path: "color.accent",
      message: "$atomic.swatch.missingSwatch does not point at a token",
    }),
    { kind: "missingReference", reference: "$atomic.swatch.missingSwatch" },
  );
});

test("a reference cycle is reported as a loop", () => {
  assert.deepEqual(
    describeRowIssue({
      path: "color.accent",
      message: "Reference cycle: $color.accent → $color.text → $color.accent",
    }),
    { kind: "loop" },
  );
});

test("any other resolver message is a general problem", () => {
  assert.deepEqual(
    describeRowIssue({ path: "stroke.default", message: "Expected a length" }),
    { kind: "other" },
  );
});

function _themeRowsWithItem(draft: ThemeDraft) {
  const input = { library: LIBRARY, themeId: "studio", draft };
  const themeResult = resolveDraftTheme({ ...input, scope: { kind: "theme" } });
  const itemResult = resolveDraftTheme({ ...input, scope: ITEM });
  if (!themeResult.ok || !itemResult.ok) {
    throw new Error("The test theme must resolve");
  }
  const rows = listTokenRows({
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
  const accent = _row(rows, "color.accent");
  assert.ok(accent?.itemOverride);
  assert.notEqual(accent.itemOverride.resolved, accent.resolved);
  assert.equal(
    accent.itemOverride.resolved,
    getResolvedTokenValue(itemTheme, "color.accent"),
  );
  assert.equal(_row(rows, "color.line")?.itemOverride, undefined);
});

test("in theme scope, an unsaved item edit also counts as the item's own value", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    ITEM,
    "stroke.default",
    "$atomic.strokeWidth.lg",
  );
  const { rows } = _themeRowsWithItem(draft);
  assert.ok(_row(rows, "stroke.default")?.itemOverride);
});

test("item-scope rows never carry an item override, since their state says it", () => {
  assert.equal(
    _rows(ITEM).filter((row) => row.itemOverride !== undefined).length,
    0,
  );
});
