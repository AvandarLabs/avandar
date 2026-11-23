import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { DRAFT_THEME_ID } from "../../../videoTheme/makeDraftThemeTargetFromLibrary/makeDraftThemeTargetFromLibrary";
import { makeResolvedVideoThemeFromSource } from "../../../videoTheme/makeResolvedVideoThemeFromSource/makeResolvedVideoThemeFromSource";
import { makeSnapshotFromThemeRequest } from "../../../videoTheme/makeSnapshotFromThemeRequest";
import {
  CLASSIC_VIDEO_THEME_SNAPSHOT,
  VideoThemeSnapshots,
} from "../../../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import {
  EMPTY_THEME_DRAFT,
  type ThemeDraft,
  ThemeDrafts,
} from "../ThemeDrafts";
import {
  THEME,
  ITEM,
  HEADING,
  LIBRARY,
  CLASSIC_WITH_OVERRIDE,
} from "./themeDraftFixtures";
import type { VideoThemeLibrary } from "../../../videoTheme/videoTheme.types";

test("a snapshot carries custom themes in its chain and leaves built-ins to the bundle", () => {
  const snapshot = ThemeDrafts.toSnapshot({
    library: LIBRARY,
    themeId: "studio",
    draft: EMPTY_THEME_DRAFT,
  });
  assert.deepEqual(snapshot.documents.map(prop("id")), ["studio"]);
  assert.deepEqual(snapshot.patches, []);
});

test("an item's patches leave out theme edits its saved override already sets", () => {
  const draft = ThemeDrafts.setTokenInDraft({
    draft: ThemeDrafts.setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: THEME,
      tokenPath: "color.accent",
      value: "$atomic.swatch.cyan",
    }),
    scope: THEME,
    tokenPath: "stroke.default",
    value: "$atomic.strokeWidth.lg",
  });
  const [themePatch] = ThemeDrafts.getPatchesForItem({
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
  const draft = ThemeDrafts.setTokenInDraft({
    draft: ThemeDrafts.setTokenInDraft({
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
    ThemeDrafts.toExportTheme({
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
    ThemeDrafts.toExportTheme({
      library: LIBRARY,
      themeId: "studio",
      draft: EMPTY_THEME_DRAFT,
      itemId: "network-graph",
    }),
    { id: "studio" },
  );
});

test("a built-in theme's draft keeps every theme edit, because its new theme would not inherit the built-in's overrides", () => {
  const draft = ThemeDrafts.setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "color.accent",
    value: "$atomic.swatch.cyan",
  });
  assert.deepEqual(
    ThemeDrafts.getPatchesForItem({
      library: CLASSIC_WITH_OVERRIDE,
      themeId: "classic",
      draft,
      itemId: "network-graph",
    }),
    [draft.patch],
  );
});

test("a built-in theme's draft snapshots as the unsaved theme that extends it", () => {
  const draft = ThemeDrafts.setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "color.accent",
    value: "$atomic.swatch.cyan",
  });
  const snapshot = ThemeDrafts.toSnapshot({
    library: CLASSIC_WITH_OVERRIDE,
    themeId: "classic",
    draft,
    itemId: "network-graph",
  });
  assert.equal(snapshot.themeId, DRAFT_THEME_ID);
  assert.deepEqual(snapshot.documents.map(prop("extends")), ["classic"]);
});

test("an unedited built-in theme snapshots as itself", () => {
  assert.deepEqual(
    ThemeDrafts.toSnapshot({
      library: CLASSIC_WITH_OVERRIDE,
      themeId: "classic",
      draft: EMPTY_THEME_DRAFT,
    }),
    CLASSIC_VIDEO_THEME_SNAPSHOT,
  );
});

test("an export lets an item's composite replace a theme-level reference", () => {
  const draft = ThemeDrafts.setTokenInDraft({
    draft: ThemeDrafts.setTokenInDraft({
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
    ThemeDrafts.toExportTheme({
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
  const draft = ThemeDrafts.setTokenInDraft({
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
  const exportTheme = ThemeDrafts.toExportTheme(target);
  assert.notEqual(exportTheme.patch, undefined);
  // The server reads a present patch, even an empty one, as a draft.
  const serverSnapshot = makeSnapshotFromThemeRequest({
    library: CLASSIC_WITH_OVERRIDE,
    id: exportTheme.id,
    patch: exportTheme.patch,
  });
  assert.equal(
    VideoThemeSnapshots.toResolvedTheme({
      snapshot: serverSnapshot,
      overrideIds: ["network-graph"],
    }).hash,
    makeResolvedVideoThemeFromSource(ThemeDrafts.toVideoThemeSource(target))
      .hash,
  );
});

function _exportAndPreviewHashes({
  library,
  themeId,
  draft,
}: Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
}>): string[] {
  const target = { library, themeId, draft, itemId: "network-graph" };
  const exported = ThemeDrafts.toExportTheme(target);
  const exportSnapshot = makeSnapshotFromThemeRequest({
    library,
    id: exported.id,
    patch: exported.patch,
  });
  return [
    VideoThemeSnapshots.toResolvedTheme({
      snapshot: exportSnapshot,
      overrideIds: ["network-graph"],
    }).hash,
    VideoThemeSnapshots.toResolvedTheme({
      snapshot: ThemeDrafts.toSnapshot(target),
      overrideIds: ["network-graph"],
    }).hash,
  ];
}

const EXPORT_DRAFT = ThemeDrafts.setTokenInDraft({
  draft: ThemeDrafts.setTokenInDraft({
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
  const [exported, preview] = _exportAndPreviewHashes({
    library: CLASSIC_WITH_OVERRIDE,
    themeId: "classic",
    draft: EXPORT_DRAFT,
  });
  assert.equal(exported, preview);
});

test("an export of a custom theme's draft resolves to the same hash as its preview", () => {
  const [exported, preview] = _exportAndPreviewHashes({
    library: LIBRARY,
    themeId: "studio",
    draft: EXPORT_DRAFT,
  });
  assert.equal(exported, preview);
});
