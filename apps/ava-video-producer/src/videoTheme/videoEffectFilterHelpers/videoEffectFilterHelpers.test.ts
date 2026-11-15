import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromLibrary } from "../makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { listVideoEffectFilters } from "./videoEffectFilterHelpers";
import type { VideoThemePatch } from "../videoTheme.types";

const SHADOWED_LABEL: VideoThemePatch = {
  other: {
    video: {
      atomic: {
        textShadow: { soft: { offsetX: 0, offsetY: 2, blur: 4, alpha: 0.5 } },
      },
      semantic: {
        text: {
          graphic: { label: { textShadow: "$atomic.textShadow.soft" } },
        },
      },
    },
  },
};

test("classic needs no SVG filters", () => {
  assert.deepEqual(
    listVideoEffectFilters(
      makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic"),
    ),
    [],
  );
});

test("a text shadow on a graphic role becomes a drop-shadow filter", () => {
  const theme = makeResolvedVideoThemeFromLibrary(
    BUILT_IN_VIDEO_THEMES,
    "classic",
    {
      patches: [SHADOWED_LABEL],
    },
  );
  assert.deepEqual(listVideoEffectFilters(theme), [
    {
      path: "text.graphic.label",
      primitives: [
        {
          kind: "dropShadow",
          dx: 0,
          dy: 2,
          stdDeviation: 2,
          color: "#edf7f4",
          opacity: 0.5,
        },
      ],
    },
  ]);
});
