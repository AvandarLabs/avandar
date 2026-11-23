import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { makeResolvedVideoThemeFromLibrary } from "../makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { BUILT_IN_VIDEO_THEMES } from "../makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { TextContrast } from "./TextContrast";

const LIGHT_GROUND = {
  other: { video: { atomic: { swatch: { ground: "#f8fafc" } } } },
};

function _failures({
  themeId,
  isLightGround,
}: Readonly<{
  themeId: string;
  isLightGround: boolean;
}>): string[] {
  const theme = makeResolvedVideoThemeFromLibrary({
    library: BUILT_IN_VIDEO_THEMES,
    themeId,
    scope: isLightGround ? { patches: [LIGHT_GROUND] } : {},
  });
  return TextContrast.listTextContrastFromTheme(theme)
    .filter(propEq("level", "fail"))
    .map((entry) => {
      return `${entry.path} ${entry.ratio.toFixed(2)}`;
    });
}

test("black on white has the maximum contrast of 21", () => {
  assert.equal(
    Math.round(
      TextContrast.getContrastRatioFromColors({
        foreground: "#000000",
        background: "#ffffff",
      }),
    ),
    21,
  );
});

test("large text passes AA at 3:1 and small text needs 4.5:1", () => {
  assert.equal(
    TextContrast.getWcagLevelFromContrast({
      ratio: 3.2,
      isLargeText: true,
    }),
    "AA",
  );
  assert.equal(
    TextContrast.getWcagLevelFromContrast({
      ratio: 3.2,
      isLargeText: false,
    }),
    "fail",
  );
});

test("every classic text role meets AA on its dark ground", () => {
  assert.deepEqual(
    _failures({
      themeId: "classic",
      isLightGround: false,
    }),
    [],
  );
});

test("every classic text role meets AA on a light ground", () => {
  assert.deepEqual(
    _failures({
      themeId: "classic",
      isLightGround: true,
    }),
    [],
  );
});

test("every avandar text role meets AA on its dark ground", () => {
  assert.deepEqual(
    _failures({
      themeId: "avandar",
      isLightGround: false,
    }),
    [],
  );
});

test("every avandar text role meets AA on a light ground", () => {
  assert.deepEqual(
    _failures({
      themeId: "avandar",
      isLightGround: true,
    }),
    [],
  );
});
