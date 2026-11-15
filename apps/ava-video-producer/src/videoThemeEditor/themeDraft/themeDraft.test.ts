import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { DRAFT_THEME_ID } from "../../videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import { createSnapshotFromThemeRequest } from "../../videoTheme/createSnapshotFromThemeRequest/createSnapshotFromThemeRequest";
import { getValueAtPath } from "../../videoTheme/getResolvedTokenValue/getResolvedTokenValue";
import { makeResolvedVideoThemeFromSource } from "../../videoTheme/makeResolvedVideoThemeFromSource/makeResolvedVideoThemeFromSource";
import {
  CLASSIC_VIDEO_THEME_SNAPSHOT,
  makeResolvedVideoThemeFromSnapshot,
} from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { setCustomValueInDraft } from "../customTokenValue/customTokenValue";
import {
  buildThemeIdFromLabel,
  countItemOverrides,
  createDraftPatchesForItem,
  createExportThemeFromDraft,
  createNewThemeDocument,
  createSavedDocumentFromDraft,
  createSnapshotFromDraft,
  createVideoThemeSourceFromDraft,
  EMPTY_THEME_DRAFT,
  getDocumentPathFromTokenPath,
  getTokenPathFromDocumentPath,
  listTokenPathsFromPatch,
  resetTokenInDraft,
  setTokenInDraft,
  type ThemeDraft,
} from "./themeDraft";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
} from "../../videoTheme/videoTheme.types";

const THEME = { kind: "theme" } as const;
const ITEM = { kind: "item", itemId: "network-graph" } as const;
const HEADING = {
  family: "$atomic.fontFamily.figtree",
  size: "$fontSizes.8xl",
  weight: "$atomic.fontWeight.bold",
  color: "$color.text",
};
const STUDIO: VideoThemeDocument = {
  schemaVersion: 1,
  id: "studio",
  label: "Studio",
  extends: "classic",
  other: { video: { atomic: { swatch: { ground: "#201510" } } } },
  overrides: {
    "network-graph": {
      other: {
        video: { semantic: { color: { accent: "$atomic.swatch.orange" } } },
      },
    },
  },
};
const LIBRARY = createVideoThemeLibrary([STUDIO]);

/** Classic with a per-item accent override, like the accents classic authors per composition. */
const CLASSIC_WITH_OVERRIDE = new Map<string, VideoThemeDocument>([
  ...BUILT_IN_VIDEO_THEMES,
  [
    "classic",
    {
      ...(BUILT_IN_VIDEO_THEMES.get("classic") as VideoThemeDocument),
      overrides: {
        "network-graph": {
          other: {
            video: { semantic: { color: { accent: "$atomic.swatch.orange" } } },
          },
        },
      },
    },
  ],
]);

test("token paths map to document paths and back in every tier", () => {
  for (const [tokenPath, documentPath] of [
    ["atomic.swatch.mint", "other.video.atomic.swatch.mint"],
    ["color.accent", "other.video.semantic.color.accent"],
    [
      "components.ProgressBar.height",
      "components.ProgressBar.defaultProps.height",
    ],
    ["fontSizes.md", "fontSizes.md"],
  ] as const) {
    assert.equal(
      getDocumentPathFromTokenPath(tokenPath).join("."),
      documentPath,
    );
    assert.equal(
      getTokenPathFromDocumentPath(documentPath.split(".")),
      tokenPath,
    );
  }
});

test("a theme-scope edit lands in the draft patch", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    THEME,
    "color.accent",
    "$atomic.swatch.cyan",
  );
  assert.equal(
    getValueAtPath(draft.patch, [
      "other",
      "video",
      "semantic",
      "color",
      "accent",
    ]),
    "$atomic.swatch.cyan",
  );
  assert.deepEqual(draft.overrides, {});
});

test("an item-scope edit lands in that item's override", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    ITEM,
    "stroke.default",
    "$atomic.strokeWidth.lg",
  );
  assert.deepEqual(Object.keys(draft.overrides), ["network-graph"]);
  assert.deepEqual(draft.patch, {});
});

test("resetting an item's last edit removes its override", () => {
  const edited = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    ITEM,
    "stroke.default",
    "$atomic.strokeWidth.lg",
  );
  assert.deepEqual(
    resetTokenInDraft(edited, ITEM, "stroke.default").overrides,
    {},
  );
});

test("patch token paths list each scale entry on its own", () => {
  assert.deepEqual(
    listTokenPathsFromPatch({
      other: {
        video: { atomic: { swatch: { mint: "#000000", cyan: "#111111" } } },
      },
    }),
    ["atomic.swatch.mint", "atomic.swatch.cyan"],
  );
});

test("saving replaces a composite token instead of merging its fields", () => {
  const base: VideoThemeDocument = {
    ...STUDIO,
    other: {
      video: {
        semantic: {
          text: {
            stage: {
              heading: {
                ...HEADING,
                letterSpacing: "$atomic.letterSpacing.tight",
              },
            },
          },
        },
      },
    },
  };
  const saved = createSavedDocumentFromDraft(
    base,
    setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "text.stage.heading", HEADING),
  );
  assert.deepEqual(
    getValueAtPath(saved, [
      "other",
      "video",
      "semantic",
      "text",
      "stage",
      "heading",
    ]),
    HEADING,
  );
});

test("a save merges item edits into the stored overrides without changing the stored theme", () => {
  const stored = JSON.stringify(STUDIO);
  const draft = setTokenInDraft(
    setTokenInDraft(EMPTY_THEME_DRAFT, ITEM, "color.accent", "#111111"),
    { kind: "item", itemId: "bar-chart" },
    "color.accent",
    "#222222",
  );
  const saved = createSavedDocumentFromDraft(STUDIO, draft);
  assert.deepEqual(Object.keys(saved.overrides ?? {}).sort(), [
    "bar-chart",
    "network-graph",
  ]);
  assert.equal(JSON.stringify(STUDIO), stored);
});

test("a new theme made from a built-in extends it and holds only the draft", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    THEME,
    "atomic.swatch.mint",
    "#123456",
  );
  assert.deepEqual(
    createNewThemeDocument({
      base: LIBRARY.get("classic") as VideoThemeDocument,
      draft,
      id: "minty",
      label: "Minty",
    }),
    {
      schemaVersion: 1,
      id: "minty",
      label: "Minty",
      extends: "classic",
      other: { video: { atomic: { swatch: { mint: "#123456" } } } },
    },
  );
});

test("a snapshot carries custom themes in its chain and leaves built-ins to the bundle", () => {
  const snapshot = createSnapshotFromDraft({
    library: LIBRARY,
    themeId: "studio",
    draft: EMPTY_THEME_DRAFT,
  });
  assert.deepEqual(
    snapshot.documents.map((document) => document.id),
    ["studio"],
  );
  assert.deepEqual(snapshot.patches, []);
});

test("an item's patches leave out theme edits its saved override already sets", () => {
  const draft = setTokenInDraft(
    setTokenInDraft(
      EMPTY_THEME_DRAFT,
      THEME,
      "color.accent",
      "$atomic.swatch.cyan",
    ),
    THEME,
    "stroke.default",
    "$atomic.strokeWidth.lg",
  );
  const [themePatch] = createDraftPatchesForItem({
    library: LIBRARY,
    themeId: "studio",
    draft,
    itemId: "network-graph",
  });
  assert.deepEqual(themePatch, {
    other: {
      video: { semantic: { stroke: { default: "$atomic.strokeWidth.lg" } } },
    },
  });
});

test("an export merges the theme and item drafts into one patch", () => {
  const draft = setTokenInDraft(
    setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "atomic.swatch.mint", "#000001"),
    ITEM,
    "atomic.swatch.cyan",
    "#000002",
  );
  assert.deepEqual(
    createExportThemeFromDraft({
      library: LIBRARY,
      themeId: "studio",
      draft,
      itemId: "network-graph",
    }),
    {
      id: "studio",
      patch: {
        other: {
          video: { atomic: { swatch: { mint: "#000001", cyan: "#000002" } } },
        },
      },
    },
  );
});

test("an export of an unedited theme names only the theme", () => {
  assert.deepEqual(
    createExportThemeFromDraft({
      library: LIBRARY,
      themeId: "studio",
      draft: EMPTY_THEME_DRAFT,
      itemId: "network-graph",
    }),
    { id: "studio" },
  );
});

test("theme ids made from labels are unique slugs", () => {
  assert.equal(
    buildThemeIdFromLabel("Warm Studio!", ["warm-studio"]),
    "warm-studio-2",
  );
});

test("a label never becomes the reserved draft theme id", () => {
  assert.equal(
    buildThemeIdFromLabel("Unsaved draft", []),
    `${DRAFT_THEME_ID}-2`,
  );
});

test("a built-in theme's draft keeps every theme edit, because its new theme would not inherit the built-in's overrides", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    THEME,
    "color.accent",
    "$atomic.swatch.cyan",
  );
  assert.deepEqual(
    createDraftPatchesForItem({
      library: CLASSIC_WITH_OVERRIDE,
      themeId: "classic",
      draft,
      itemId: "network-graph",
    }),
    [draft.patch],
  );
});

test("a built-in theme's draft snapshots as the unsaved theme that extends it", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    THEME,
    "color.accent",
    "$atomic.swatch.cyan",
  );
  const snapshot = createSnapshotFromDraft({
    library: CLASSIC_WITH_OVERRIDE,
    themeId: "classic",
    draft,
    itemId: "network-graph",
  });
  assert.equal(snapshot.themeId, DRAFT_THEME_ID);
  assert.deepEqual(
    snapshot.documents.map((document) => document.extends),
    ["classic"],
  );
});

test("an unedited built-in theme snapshots as itself", () => {
  assert.deepEqual(
    createSnapshotFromDraft({
      library: CLASSIC_WITH_OVERRIDE,
      themeId: "classic",
      draft: EMPTY_THEME_DRAFT,
    }),
    CLASSIC_VIDEO_THEME_SNAPSHOT,
  );
});

test("a built-in theme's draft counts no saved item overrides", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    THEME,
    "stroke.default",
    "$atomic.strokeWidth.lg",
  );
  assert.equal(
    countItemOverrides({
      library: CLASSIC_WITH_OVERRIDE,
      themeId: "classic",
      draft,
      itemId: "network-graph",
    }),
    0,
  );
});

test("one custom value counts as one override, not a token plus its generated swatch", () => {
  const draft = setCustomValueInDraft(EMPTY_THEME_DRAFT, ITEM, {
    tokenPath: "color.accent",
    fieldPath: [],
    currentValue: "$primary",
    currentReference: "$primary",
    kind: "color",
    literal: "#00ff00",
  });
  assert.equal(
    countItemOverrides({
      library: LIBRARY,
      themeId: "studio",
      draft,
      itemId: "network-graph",
    }),
    1,
  );
});

test("an export lets an item's composite replace a theme-level reference", () => {
  const draft = setTokenInDraft(
    setTokenInDraft(
      EMPTY_THEME_DRAFT,
      THEME,
      "text.stage.heading",
      "$text.stage.subtitle",
    ),
    ITEM,
    "text.stage.heading",
    HEADING,
  );
  assert.deepEqual(
    createExportThemeFromDraft({
      library: LIBRARY,
      themeId: "studio",
      draft,
      itemId: "network-graph",
    }),
    {
      id: "studio",
      patch: {
        other: {
          video: { semantic: { text: { stage: { heading: HEADING } } } },
        },
      },
    },
  );
});

test("an export from a built-in draft carries a patch even when only another item changed", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    { kind: "item", itemId: "bar-chart" },
    "stroke.default",
    "$atomic.strokeWidth.lg",
  );
  const target = {
    library: CLASSIC_WITH_OVERRIDE,
    themeId: "classic",
    draft,
    itemId: "network-graph",
  };
  const exportTheme = createExportThemeFromDraft(target);
  assert.notEqual(exportTheme.patch, undefined);
  // The server reads a present patch, even an empty one, as a draft.
  const serverSnapshot = createSnapshotFromThemeRequest({
    library: CLASSIC_WITH_OVERRIDE,
    id: exportTheme.id,
    patch: exportTheme.patch,
  });
  assert.equal(
    makeResolvedVideoThemeFromSnapshot(serverSnapshot, ["network-graph"]).hash,
    makeResolvedVideoThemeFromSource(createVideoThemeSourceFromDraft(target))
      .hash,
  );
});

function _exportAndPreviewHashes(
  library: VideoThemeLibrary,
  themeId: string,
  draft: ThemeDraft,
) {
  const target = { library, themeId, draft, itemId: "network-graph" };
  const exported = createExportThemeFromDraft(target);
  const exportSnapshot = createSnapshotFromThemeRequest({
    library,
    id: exported.id,
    patch: exported.patch,
  });
  return [
    makeResolvedVideoThemeFromSnapshot(exportSnapshot, ["network-graph"]).hash,
    makeResolvedVideoThemeFromSnapshot(createSnapshotFromDraft(target), [
      "network-graph",
    ]).hash,
  ];
}

const EXPORT_DRAFT = setTokenInDraft(
  setTokenInDraft(
    EMPTY_THEME_DRAFT,
    THEME,
    "color.accent",
    "$atomic.swatch.cyan",
  ),
  ITEM,
  "stroke.default",
  "$atomic.strokeWidth.lg",
);

test("an export of a built-in theme's draft resolves to the same hash as its preview", () => {
  const [exported, preview] = _exportAndPreviewHashes(
    CLASSIC_WITH_OVERRIDE,
    "classic",
    EXPORT_DRAFT,
  );
  assert.equal(exported, preview);
});

test("an export of a custom theme's draft resolves to the same hash as its preview", () => {
  const [exported, preview] = _exportAndPreviewHashes(
    LIBRARY,
    "studio",
    EXPORT_DRAFT,
  );
  assert.equal(exported, preview);
});
