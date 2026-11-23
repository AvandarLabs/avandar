import assert from "node:assert/strict";
import test from "node:test";
import { makeResolvedVideoThemeFromSource } from "../../../videoTheme/makeResolvedVideoThemeFromSource/makeResolvedVideoThemeFromSource";
import { BUILT_IN_VIDEO_THEMES } from "../../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { mergeVideoThemePatches } from "../../../videoTheme/mergeVideoThemeLayers/mergeVideoThemePatches/mergeVideoThemePatches";
import {
  makeStarterVideoThemeSourceFromItemId,
  STARTER_VIDEO_THEME_ID,
} from "./makeStarterVideoThemeSourceFromItemId";
import type { VideoThemeDocument } from "../../../videoTheme/videoTheme.types";

/** The hex Chrome renders for each `src/theme.css` colour. */
const THEME_CSS_PALETTE = {
  background: "#060a13",
  foreground: "#f8fafc",
  card: "#121723",
  muted: "#212937",
  mutedForeground: "#99a6b8",
  border: "#252e3d",
  brand: "#5d90ff",
  brandSoft: "#1e305b",
  brandStrong: "#97c2ff",
  ground: "#03050e",
};

test("starter inherits the classic theme", () => {
  assert.equal(
    BUILT_IN_VIDEO_THEMES.get(STARTER_VIDEO_THEME_ID)?.extends,
    "classic",
  );
});

test("starter draws the theme.css palette", () => {
  const theme = makeResolvedVideoThemeFromSource(
    makeStarterVideoThemeSourceFromItemId("demo"),
  );
  const { shadow, ...palette } = theme.semantic.color.scene;
  assert.deepEqual(palette, THEME_CSS_PALETTE);
  assert.equal(shadow, undefined);
});

test("starter keeps the theme.css palette when classic's scene palette moves", () => {
  const classic = BUILT_IN_VIDEO_THEMES.get("classic")!;
  const moved: VideoThemeDocument = {
    ...classic,
    ...mergeVideoThemePatches(classic, {
      other: {
        video: {
          semantic: { color: { scene: { brand: "$atomic.swatch.orange" } } },
        },
      },
    }),
  };
  const library = new Map(BUILT_IN_VIDEO_THEMES);
  library.set("classic", moved);
  const theme = makeResolvedVideoThemeFromSource({
    ...makeStarterVideoThemeSourceFromItemId("demo"),
    library,
  });
  assert.equal(theme.semantic.color.scene.brand, THEME_CSS_PALETTE.brand);
});

test("each composition id gets one stable source with its override scope", () => {
  const source = makeStarterVideoThemeSourceFromItemId("motion-lab");
  assert.equal(makeStarterVideoThemeSourceFromItemId("motion-lab"), source);
  assert.deepEqual(source.scope?.overrideIds, ["motion-lab"]);
});
