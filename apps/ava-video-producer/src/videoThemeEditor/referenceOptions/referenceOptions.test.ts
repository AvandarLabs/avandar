import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { DraftThemeResolution } from "../DraftThemeResolution/DraftThemeResolution";
import { EMPTY_THEME_DRAFT } from "../ThemeDrafts/ThemeDrafts";
import { TokenRows } from "../TokenRows/TokenRows";
import { ReferenceOptions } from "./ReferenceOptions";
import type { TokenKind } from "../../videoTheme/videoTheme.types";

const SCOPE = { kind: "theme" } as const;

const RESOLVED = DraftThemeResolution.makeDraftThemeResultFromDraft({
  library: BUILT_IN_VIDEO_THEMES,
  themeId: "classic",
  draft: EMPTY_THEME_DRAFT,
  scope: SCOPE,
});

if (!RESOLVED.ok) {
  throw new Error("classic must resolve");
}

const ROWS = TokenRows.listTokenRows({
  library: BUILT_IN_VIDEO_THEMES,
  themeId: "classic",
  draft: EMPTY_THEME_DRAFT,
  scope: SCOPE,
  merged: RESOLVED.merged,
  theme: RESOLVED.theme,
});

const THEME = RESOLVED.theme;

function _references({
  kind,
  excludePath,
}: Readonly<{
  kind: TokenKind;
  excludePath?: string;
}>): readonly string[] {
  return ReferenceOptions.listReferenceOptions({
    kind,
    excludePath,
    rows: ROWS,
    theme: THEME,
  }).map(prop("reference"));
}

test("a colour picker offers the primary colour, swatches, semantic colours, and palette shades", () => {
  const references = _references({
    kind: "color",
    excludePath: "color.accent",
  });
  [
    "$primary",
    "$atomic.swatch.mint",
    "$color.text",
    "$colors.primary.4",
  ].forEach((reference) => {
    assert.ok(references.includes(reference), reference);
  });
  assert.ok(!references.includes("$color.accent"));
});

test("a size picker offers Mantine font sizes as lengths", () => {
  assert.ok(_references({ kind: "length" }).includes("$fontSizes.md"));
});

test("a weight picker offers heading weights but not line heights", () => {
  const references = _references({ kind: "fontWeight" });
  assert.ok(references.includes("$headings.sizes.h2.fontWeight"));
  assert.ok(references.includes("$atomic.fontWeight.bold"));
  assert.ok(!references.includes("$lineHeights.md"));
});

test("a fill picker offers the ground gradient", () => {
  assert.ok(_references({ kind: "fill" }).includes("$defaultGradient"));
});

test("options from the current reference's scale come first", () => {
  const ordered = ReferenceOptions.orderReferenceOptions({
    referenceOptions: ReferenceOptions.listReferenceOptions({
      kind: "length",
      rows: ROWS,
      theme: THEME,
    }),
    current: "$fontSizes.7xl",
  });
  assert.ok(ordered[0].path.startsWith("fontSizes."));
});

test("a camera curve picker offers only camera-safe curves", () => {
  const references = ReferenceOptions.listReferenceOptions({
    kind: "easing",
    rows: ROWS,
    theme: THEME,
    isCameraCurve: true,
  }).map(prop("reference"));
  assert.ok(references.includes("$atomic.easing.inOut"));
  assert.ok(references.includes("$atomic.easing.inOutCubic"));
  assert.ok(!references.includes("$atomic.easing.outBack"));
  assert.ok(_references({ kind: "easing" }).includes("$atomic.easing.outBack"));
});

test("camera curves are the named camera curves and each camera preset's curve", () => {
  assert.equal(
    ReferenceOptions.isCameraCurveToken({ tokenPath: "camera.easing.push" }),
    true,
  );
  assert.equal(
    ReferenceOptions.isCameraCurveToken({
      tokenPath: "camera.presets.whip",
      fieldPath: ["easing"],
    }),
    true,
  );
  assert.equal(
    ReferenceOptions.isCameraCurveToken({
      tokenPath: "camera.presets.whip",
      fieldPath: ["speed"],
    }),
    false,
  );
  assert.equal(
    ReferenceOptions.isCameraCurveToken({ tokenPath: "atomic.easing.outBack" }),
    false,
  );
});

test("an option's role says whether it is the primary colour, a custom value, or a named entry", () => {
  const base = { kind: "color", value: "#00ff00" } as const;
  assert.equal(
    ReferenceOptions.getReferenceOptionRole({
      ...base,
      reference: "$primary",
      path: "primary",
    }),
    "primary",
  );
  assert.equal(
    ReferenceOptions.getReferenceOptionRole({
      ...base,
      reference: "$atomic.swatch.customColorAccent",
      path: "atomic.swatch.customColorAccent",
      key: "customColorAccent",
    }),
    "custom",
  );
  assert.equal(
    ReferenceOptions.getReferenceOptionRole({
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
    ReferenceOptions.getUnresolvedReference({
      value: "$atomic.swatch.missingSwatch",
      referenceOptions: options,
    }),
    "$atomic.swatch.missingSwatch",
  );
  assert.equal(
    ReferenceOptions.getUnresolvedReference({
      value: "$atomic.swatch.mint",
      referenceOptions: options,
    }),
    undefined,
  );
  assert.equal(
    ReferenceOptions.getUnresolvedReference({
      value: "#ff0000",
      referenceOptions: options,
    }),
    undefined,
  );
  assert.equal(
    ReferenceOptions.getUnresolvedReference({
      value: undefined,
      referenceOptions: options,
    }),
    undefined,
  );
});
