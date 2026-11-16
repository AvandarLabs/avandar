import assert from "node:assert/strict";
import test from "node:test";
import { DRAFT_THEME_ID } from "../../../videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import { createSnapshotFromThemeRequest } from "../../../videoTheme/createSnapshotFromThemeRequest";
import { makeResolvedVideoThemeFromSource } from "../../../videoTheme/makeResolvedVideoThemeFromSource/makeResolvedVideoThemeFromSource";
import {
  CLASSIC_VIDEO_THEME_SNAPSHOT,
  makeResolvedVideoThemeFromSnapshot,
} from "../../../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import {
  createDraftPatchesForItem,
  createExportThemeFromDraft,
  createSnapshotFromDraft,
  createVideoThemeSourceFromDraft,
  EMPTY_THEME_DRAFT,
  setTokenInDraft,
  type ThemeDraft,
} from "../themeDraft";
import {
  THEME,
  ITEM,
  HEADING,
  LIBRARY,
  CLASSIC_WITH_OVERRIDE,
} from "./themeDraftFixtures";
import type { VideoThemeLibrary } from "../../../videoTheme/videoTheme.types";

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
  const draft = setTokenInDraft({
    draft: setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: THEME,
      tokenPath: "color.accent",
      value: "$atomic.swatch.cyan",
    }),
    scope: THEME,
    tokenPath: "stroke.default",
    value: "$atomic.strokeWidth.lg",
  });
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
  const draft = setTokenInDraft({
    draft: setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: THEME,
      tokenPath: "atomic.swatch.mint",
      value: "#000001",
    }),
    scope: ITEM,
    tokenPath: "atomic.swatch.cyan",
    value: "#000002",
  });
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

test("a built-in theme's draft keeps every theme edit, because its new theme would not inherit the built-in's overrides", () => {
  const draft = setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "color.accent",
    value: "$atomic.swatch.cyan",
  });
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
  const draft = setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "color.accent",
    value: "$atomic.swatch.cyan",
  });
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

test("an export lets an item's composite replace a theme-level reference", () => {
  const draft = setTokenInDraft({
    draft: setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: THEME,
      tokenPath: "text.stage.heading",
      value: "$text.stage.subtitle",
    }),
    scope: ITEM,
    tokenPath: "text.stage.heading",
    value: HEADING,
  });
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
  const draft = setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: { kind: "item", itemId: "bar-chart" },
    tokenPath: "stroke.default",
    value: "$atomic.strokeWidth.lg",
  });
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

const EXPORT_DRAFT = setTokenInDraft({
  draft: setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "color.accent",
    value: "$atomic.swatch.cyan",
  }),
  scope: ITEM,
  tokenPath: "stroke.default",
  value: "$atomic.strokeWidth.lg",
});

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
