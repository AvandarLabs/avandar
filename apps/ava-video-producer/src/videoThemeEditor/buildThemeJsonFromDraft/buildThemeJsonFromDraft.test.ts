import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import {
  createNewThemeDocument,
  createSavedDocumentFromDraft,
  EMPTY_THEME_DRAFT,
  setTokenInDraft,
} from "../themeDraft/themeDraft";
import { buildThemeJsonFromDraft } from "./buildThemeJsonFromDraft";
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
const LIBRARY = createVideoThemeLibrary([STUDIO]);
const DRAFT = setTokenInDraft(
  EMPTY_THEME_DRAFT,
  THEME,
  "color.accent",
  "$atomic.swatch.cyan",
);

/** Classic with a per-item accent the built-in carries itself. */
const LIBRARY_WITH_CLASSIC_OVERRIDE = new Map<string, VideoThemeDocument>([
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

test("a custom theme copies as saving its draft in place would write it", () => {
  const json = buildThemeJsonFromDraft({
    library: LIBRARY,
    themeId: "studio",
    draft: DRAFT,
  });
  assert.deepEqual(
    JSON.parse(json as string),
    createSavedDocumentFromDraft(STUDIO, DRAFT),
  );
});

test("a built-in theme copies as the sparse theme Save as new writes, without its own item overrides", () => {
  const json = buildThemeJsonFromDraft({
    library: LIBRARY_WITH_CLASSIC_OVERRIDE,
    themeId: "classic",
    draft: DRAFT,
  });
  const copied = JSON.parse(json as string);
  assert.equal(copied.extends, "classic");
  assert.equal(copied.overrides, undefined);
  assert.notEqual(copied.id, "classic");
  const { id, label } = copied;
  assert.deepEqual(
    copied,
    createNewThemeDocument({
      base: LIBRARY_WITH_CLASSIC_OVERRIDE.get("classic") as VideoThemeDocument,
      draft: DRAFT,
      id,
      label,
    }),
  );
});

test("a built-in copy gets an id that no loaded theme uses", () => {
  const json = buildThemeJsonFromDraft({
    library: LIBRARY,
    themeId: "classic",
    draft: DRAFT,
  });
  const copied = JSON.parse(json as string);
  assert.equal(LIBRARY.has(copied.id), false);
  assert.match(copied.label, /Classic/);
});

test("a theme that is not loaded copies nothing", () => {
  assert.equal(
    buildThemeJsonFromDraft({
      library: LIBRARY,
      themeId: "missing",
      draft: DRAFT,
    }),
    undefined,
  );
});
