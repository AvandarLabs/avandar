import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  makeVideoThemeLibraryFromDocuments,
} from "../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { makeThemeJsonFromDraft } from "../makeThemeJsonFromDraft/makeThemeJsonFromDraft";
import { EMPTY_THEME_DRAFT, ThemeDrafts } from "../ThemeDrafts/ThemeDrafts";
import type { VideoThemeDocument } from "../../videoTheme/videoTheme.types";

const THEME = { kind: "theme" } as const;
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
const LIBRARY = makeVideoThemeLibraryFromDocuments([STUDIO]);
const DRAFT = ThemeDrafts.setTokenInDraft({
  draft: EMPTY_THEME_DRAFT,
  scope: THEME,
  tokenPath: "color.accent",
  value: "$atomic.swatch.cyan",
});
/** Classic with a per-item accent the built-in carries itself. */
const LIBRARY_WITH_CLASSIC_OVERRIDE = new Map<string, VideoThemeDocument>([
  ...BUILT_IN_VIDEO_THEMES,
  [
    "classic",
    {
      ...BUILT_IN_VIDEO_THEMES.get("classic")!,
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
test("a custom theme copies as saving its draft in place would write it", () => {
  const json = makeThemeJsonFromDraft({
    library: LIBRARY,
    themeId: "studio",
    draft: DRAFT,
  });
  assert.deepEqual(
    JSON.parse(json!),
    ThemeDrafts.toSavedDocument({
      document: STUDIO,
      draft: DRAFT,
    }),
  );
});
test("a built-in theme copies as the sparse theme Save as new writes, without its own item overrides", () => {
  const json = makeThemeJsonFromDraft({
    library: LIBRARY_WITH_CLASSIC_OVERRIDE,
    themeId: "classic",
    draft: DRAFT,
  });
  const copied = JSON.parse(json!);
  assert.equal(copied.extends, "classic");
  assert.equal(copied.overrides, undefined);
  assert.notEqual(copied.id, "classic");
  const { id, label } = copied;
  assert.deepEqual(
    copied,
    ThemeDrafts.makeNewDocumentFromBase({
      base: LIBRARY_WITH_CLASSIC_OVERRIDE.get("classic")!,
      draft: DRAFT,
      id,
      label,
    }),
  );
});
test("a built-in copy gets an id that no loaded theme uses", () => {
  const json = makeThemeJsonFromDraft({
    library: LIBRARY,
    themeId: "classic",
    draft: DRAFT,
  });
  const copied = JSON.parse(json!);
  assert.equal(LIBRARY.has(copied.id), false);
  assert.match(copied.label, /Classic/);
});
test("a theme that is not loaded copies nothing", () => {
  assert.equal(
    makeThemeJsonFromDraft({
      library: LIBRARY,
      themeId: "missing",
      draft: DRAFT,
    }),
    undefined,
  );
});
