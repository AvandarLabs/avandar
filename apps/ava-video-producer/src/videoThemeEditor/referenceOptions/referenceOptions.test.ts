import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { makeDraftThemeResultFromDraft } from "../resolveDraftTheme/resolveDraftTheme";
import { EMPTY_THEME_DRAFT } from "../themeDraft/themeDraft";
import { listTokenRows } from "../tokenRows/tokenRows";
import {
  getReferenceOptionRole,
  getUnresolvedReference,
  isCameraCurveToken,
  listReferenceOptions,
  orderReferenceOptions,
} from "./referenceOptions";
import type { TokenKind } from "../../videoTheme/videoTheme.types";

const SCOPE = { kind: "theme" } as const;
const RESOLVED = makeDraftThemeResultFromDraft({
  library: BUILT_IN_VIDEO_THEMES,
  themeId: "classic",
  draft: EMPTY_THEME_DRAFT,
  scope: SCOPE,
});
if (!RESOLVED.ok) {
  throw new Error("classic must resolve");
}
const ROWS = listTokenRows({
  library: BUILT_IN_VIDEO_THEMES,
  themeId: "classic",
  draft: EMPTY_THEME_DRAFT,
  scope: SCOPE,
  merged: RESOLVED.merged,
  theme: RESOLVED.theme,
});

const THEME = RESOLVED.theme;

function _references(kind: TokenKind, excludePath?: string): readonly string[] {
  return listReferenceOptions({
    kind,
    excludePath,
    rows: ROWS,
    theme: THEME,
  }).map((option) => option.reference);
}

test("a colour picker offers the primary colour, swatches, semantic colours, and palette shades", () => {
  const references = _references("color", "color.accent");
  for (const reference of [
    "$primary",
    "$atomic.swatch.mint",
    "$color.text",
    "$colors.primary.4",
  ]) {
    assert.ok(references.includes(reference), reference);
  }
  assert.ok(!references.includes("$color.accent"));
});

test("a size picker offers Mantine font sizes as lengths", () => {
  assert.ok(_references("length").includes("$fontSizes.md"));
});

test("a weight picker offers heading weights but not line heights", () => {
  const references = _references("fontWeight");
  assert.ok(references.includes("$headings.sizes.h2.fontWeight"));
  assert.ok(references.includes("$atomic.fontWeight.bold"));
  assert.ok(!references.includes("$lineHeights.md"));
});

test("a fill picker offers the ground gradient", () => {
  assert.ok(_references("fill").includes("$defaultGradient"));
});

test("options from the current reference's scale come first", () => {
  const ordered = orderReferenceOptions({
    referenceOptions: listReferenceOptions({
      kind: "length",
      rows: ROWS,
      theme: THEME,
    }),
    current: "$fontSizes.7xl",
  });
  assert.ok(ordered[0].path.startsWith("fontSizes."));
});

test("a camera curve picker offers only camera-safe curves", () => {
  const references = listReferenceOptions({
    kind: "easing",
    rows: ROWS,
    theme: THEME,
    isCameraCurve: true,
  }).map((option) => option.reference);
  assert.ok(references.includes("$atomic.easing.inOut"));
  assert.ok(references.includes("$atomic.easing.inOutCubic"));
  assert.ok(!references.includes("$atomic.easing.outBack"));
  assert.ok(_references("easing").includes("$atomic.easing.outBack"));
});

test("camera curves are the named camera curves and each camera preset's curve", () => {
  assert.equal(isCameraCurveToken("camera.easing.push"), true);
  assert.equal(isCameraCurveToken("camera.presets.whip", ["easing"]), true);
  assert.equal(isCameraCurveToken("camera.presets.whip", ["speed"]), false);
  assert.equal(isCameraCurveToken("atomic.easing.outBack"), false);
});

test("an option's role says whether it is the primary colour, a custom value, or a named entry", () => {
  const base = { kind: "color", value: "#00ff00" } as const;
  assert.equal(
    getReferenceOptionRole({
      ...base,
      reference: "$primary",
      path: "primary",
    }),
    "primary",
  );
  assert.equal(
    getReferenceOptionRole({
      ...base,
      reference: "$atomic.swatch.customColorAccent",
      path: "atomic.swatch.customColorAccent",
      key: "customColorAccent",
    }),
    "custom",
  );
  assert.equal(
    getReferenceOptionRole({
      ...base,
      reference: "$atomic.swatch.mint",
      path: "atomic.swatch.mint",
      key: "mint",
    }),
    "named",
  );
});

test("a reference no option offers is unresolved, and a listed or unset value is not", () => {
  const options = [
    {
      reference: "$atomic.swatch.mint",
      path: "atomic.swatch.mint",
      kind: "color",
      value: "#5ee8c0",
    },
  ] as const;
  assert.equal(
    getUnresolvedReference({
      value: "$atomic.swatch.missingSwatch",
      referenceOptions: options,
    }),
    "$atomic.swatch.missingSwatch",
  );
  assert.equal(
    getUnresolvedReference({
      value: "$atomic.swatch.mint",
      referenceOptions: options,
    }),
    undefined,
  );
  assert.equal(
    getUnresolvedReference({ value: "#ff0000", referenceOptions: options }),
    undefined,
  );
  assert.equal(
    getUnresolvedReference({ value: undefined, referenceOptions: options }),
    undefined,
  );
});
