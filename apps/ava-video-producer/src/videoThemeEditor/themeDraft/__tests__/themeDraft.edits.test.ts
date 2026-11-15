import assert from "node:assert/strict";
import test from "node:test";
import { getValueAtPath } from "../../../videoTheme/getValueAtPath";
import { setCustomValueInDraft } from "../../customTokenValue/customTokenValue";
import {
  countItemOverrides,
  EMPTY_THEME_DRAFT,
  listTokenPathsFromPatch,
  resetTokenInDraft,
  setTokenInDraft,
} from "../themeDraft";
import {
  THEME,
  ITEM,
  LIBRARY,
  CLASSIC_WITH_OVERRIDE,
} from "./themeDraftFixtures";

test("a theme-scope edit lands in the draft patch", () => {
  const draft = setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "color.accent",
    value: "$atomic.swatch.cyan",
  });
  assert.equal(
    getValueAtPath(draft.patch, [
      "other",
      "video",
      "semantic",
      "color",
      "accent",
    ]),
    "$atomic.swatch.cyan",
  );
  assert.deepEqual(draft.overrides, {});
});

test("an item-scope edit lands in that item's override", () => {
  const draft = setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: ITEM,
    tokenPath: "stroke.default",
    value: "$atomic.strokeWidth.lg",
  });
  assert.deepEqual(Object.keys(draft.overrides), ["network-graph"]);
  assert.deepEqual(draft.patch, {});
});

test("resetting an item's last edit removes its override", () => {
  const edited = setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: ITEM,
    tokenPath: "stroke.default",
    value: "$atomic.strokeWidth.lg",
  });
  assert.deepEqual(
    resetTokenInDraft({
      draft: edited,
      scope: ITEM,
      tokenPath: "stroke.default",
    }).overrides,
    {},
  );
});

test("patch token paths list each scale entry on its own", () => {
  assert.deepEqual(
    listTokenPathsFromPatch({
      other: {
        video: { atomic: { swatch: { mint: "#000000", cyan: "#111111" } } },
      },
    }),
    ["atomic.swatch.mint", "atomic.swatch.cyan"],
  );
});

test("a built-in theme's draft counts no saved item overrides", () => {
  const draft = setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "stroke.default",
    value: "$atomic.strokeWidth.lg",
  });
  assert.equal(
    countItemOverrides({
      library: CLASSIC_WITH_OVERRIDE,
      themeId: "classic",
      draft,
      itemId: "network-graph",
    }),
    0,
  );
});

test("one custom value counts as one override, not a token plus its generated swatch", () => {
  const draft = setCustomValueInDraft(EMPTY_THEME_DRAFT, ITEM, {
    tokenPath: "color.accent",
    fieldPath: [],
    currentValue: "$primary",
    currentReference: "$primary",
    kind: "color",
    literal: "#00ff00",
  });
  assert.equal(
    countItemOverrides({
      library: LIBRARY,
      themeId: "studio",
      draft,
      itemId: "network-graph",
    }),
    1,
  );
});
