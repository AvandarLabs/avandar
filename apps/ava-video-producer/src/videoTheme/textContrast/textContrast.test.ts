import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";
import {
  getContrastRatioFromColors,
  getWcagLevelFromContrast,
  listTextContrastFromTheme,
} from "./textContrast";

const LIGHT_GROUND = { other: { video: { atomic: { swatch: { ground: "#f8fafc" } } } } };

function _failures(themeId: string, isLightGround: boolean): string[] {
  const theme = resolveVideoTheme(
    BUILT_IN_VIDEO_THEMES,
    themeId,
    isLightGround ? { patches: [LIGHT_GROUND] } : {},
  );
  return listTextContrastFromTheme(theme)
    .filter((entry) => entry.level === "fail")
    .map((entry) => `${entry.path} ${entry.ratio.toFixed(2)}`);
}

test("black on white has the maximum contrast of 21", () => {
  assert.equal(Math.round(getContrastRatioFromColors("#000000", "#ffffff")), 21);
});

test("large text passes AA at 3:1 and small text needs 4.5:1", () => {
  assert.equal(getWcagLevelFromContrast(3.2, true), "AA");
  assert.equal(getWcagLevelFromContrast(3.2, false), "fail");
});

test("every classic text role meets AA on its dark ground", () => {
  assert.deepEqual(_failures("classic", false), []);
});

test("every classic text role meets AA on a light ground", () => {
  assert.deepEqual(_failures("classic", true), []);
});

test("every avandar text role meets AA on its dark ground", () => {
  assert.deepEqual(_failures("avandar", false), []);
});

test("every avandar text role meets AA on a light ground", () => {
  assert.deepEqual(_failures("avandar", true), []);
});
