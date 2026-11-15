import assert from "node:assert/strict";
import test from "node:test";
import { getValueAtPath } from "../../videoTheme/getValueAtPath";
import { EMPTY_THEME_DRAFT } from "../themeDraft/themeDraft";
import {
  getCustomScaleFromReference,
  setCustomValueInDraft,
} from "./customTokenValue";

const THEME = { kind: "theme" } as const;
const SUBTITLE = {
  family: "$atomic.fontFamily.figtree",
  size: "$fontSizes.7xl",
  weight: "$atomic.fontWeight.regular",
  lineHeight: "$lineHeights.lg",
  color: "$color.text",
};

test("a custom colour on a semantic token becomes a named swatch", () => {
  const draft = setCustomValueInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    request: {
      tokenPath: "color.accent",
      fieldPath: [],
      currentValue: "$primary",
      currentReference: "$primary",
      kind: "color",
      literal: "#ff0000",
    },
  });
  assert.equal(
    getValueAtPath(draft.patch, [
      "other",
      "video",
      "atomic",
      "swatch",
      "customColorAccent",
    ]),
    "#ff0000",
  );
  assert.equal(
    getValueAtPath(draft.patch, [
      "other",
      "video",
      "semantic",
      "color",
      "accent",
    ]),
    "$atomic.swatch.customColorAccent",
  );
});

test("a custom size keeps the scale its field already points at", () => {
  const draft = setCustomValueInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    request: {
      tokenPath: "text.stage.subtitle",
      fieldPath: ["size"],
      currentValue: SUBTITLE,
      currentReference: "$fontSizes.7xl",
      kind: "length",
      literal: 27,
    },
  });
  assert.equal(
    getValueAtPath(draft.patch, ["fontSizes", "customTextStageSubtitleSize"]),
    "27px",
  );
  assert.deepEqual(
    getValueAtPath(draft.patch, [
      "other",
      "video",
      "semantic",
      "text",
      "stage",
      "subtitle",
    ]),
    {
      ...SUBTITLE,
      size: "$fontSizes.customTextStageSubtitleSize",
    },
  );
});

test("a length that points at another semantic token has no custom scale", () => {
  assert.equal(
    getCustomScaleFromReference({
      reference: "$stroke.default",
      kind: "length",
    }),
    undefined,
  );
});
