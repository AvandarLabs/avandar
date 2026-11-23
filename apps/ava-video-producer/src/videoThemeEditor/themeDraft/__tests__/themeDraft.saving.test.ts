import assert from "node:assert/strict";
import test from "node:test";
import { DRAFT_THEME_ID } from "../../../videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import { getValueAtPath } from "../../../videoTheme/getValueAtPath";
import {
  buildThemeIdFromLabel,
  createNewThemeDocument,
  createSavedDocumentFromDraft,
  EMPTY_THEME_DRAFT,
  setTokenInDraft,
} from "../themeDraft";
import { THEME, ITEM, HEADING, STUDIO, LIBRARY } from "./themeDraftFixtures";
import type { VideoThemeDocument } from "../../../videoTheme/videoTheme.types";

test("saving replaces a composite token instead of merging its fields", () => {
  const base: VideoThemeDocument = {
    ...STUDIO,
    other: {
      video: {
        semantic: {
          text: {
            stage: {
              heading: {
                ...HEADING,
                letterSpacing: "$atomic.letterSpacing.tight",
              },
            },
          },
        },
      },
    },
  };
  const saved = createSavedDocumentFromDraft(
    base,
    setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: THEME,
      tokenPath: "text.stage.heading",
      value: HEADING,
    }),
  );
  assert.deepEqual(
    getValueAtPath(saved, [
      "other",
      "video",
      "semantic",
      "text",
      "stage",
      "heading",
    ]),
    HEADING,
  );
});

test("a save merges item edits into the stored overrides without changing the stored theme", () => {
  const stored = JSON.stringify(STUDIO);
  const draft = setTokenInDraft({
    draft: setTokenInDraft({
      draft: EMPTY_THEME_DRAFT,
      scope: ITEM,
      tokenPath: "color.accent",
      value: "#111111",
    }),
    scope: { kind: "item", itemId: "bar-chart" },
    tokenPath: "color.accent",
    value: "#222222",
  });
  const saved = createSavedDocumentFromDraft(STUDIO, draft);
  assert.deepEqual(Object.keys(saved.overrides ?? {}).sort(), [
    "bar-chart",
    "network-graph",
  ]);
  assert.equal(JSON.stringify(STUDIO), stored);
});

test("a new theme made from a built-in extends it and holds only the draft", () => {
  const draft = setTokenInDraft({
    draft: EMPTY_THEME_DRAFT,
    scope: THEME,
    tokenPath: "atomic.swatch.mint",
    value: "#123456",
  });
  assert.deepEqual(
    createNewThemeDocument({
      base: LIBRARY.get("classic")!,
      draft,
      id: "minty",
      label: "Minty",
    }),
    {
      schemaVersion: 1,
      id: "minty",
      label: "Minty",
      extends: "classic",
      other: { video: { atomic: { swatch: { mint: "#123456" } } } },
    },
  );
});

test("theme ids made from labels are unique slugs", () => {
  assert.equal(
    buildThemeIdFromLabel("Warm Studio!", ["warm-studio"]),
    "warm-studio-2",
  );
});

test("a label never becomes the reserved draft theme id", () => {
  assert.equal(
    buildThemeIdFromLabel("Unsaved draft", []),
    `${DRAFT_THEME_ID}-2`,
  );
});
