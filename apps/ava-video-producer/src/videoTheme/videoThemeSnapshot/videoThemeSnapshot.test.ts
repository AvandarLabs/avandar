import assert from "node:assert/strict";
import test from "node:test";
import { createVideoThemeLibrary } from "../builtInVideoThemes/builtInVideoThemes";
import {
  addPatchesToVideoThemeSnapshot,
  CLASSIC_VIDEO_THEME_SNAPSHOT,
  createVideoThemeSnapshot,
  createVideoThemeSourceFromSnapshot,
  resolveVideoThemeFromSnapshot,
} from "./videoThemeSnapshot";
import type { VideoThemeDocument } from "../videoTheme.types";

const WARM: VideoThemeDocument = {
  schemaVersion: 1,
  id: "warm",
  label: "Warm",
  extends: "avandar",
  other: { video: { atomic: { swatch: { ground: "#201510" } } } },
  overrides: {
    "shared-object-handoff": {
      other: { video: { atomic: { swatch: { ground: "#111111" } } } },
    },
  },
};
const RED_GROUND = {
  other: { video: { atomic: { swatch: { ground: "#330000" } } } },
};

test("an undefined snapshot means classic", () => {
  const theme = resolveVideoThemeFromSnapshot(undefined, []);
  assert.equal(theme.id, "classic");
});

test("a snapshot keeps the theme and the custom themes it extends, without built-ins", () => {
  const snapshot = createVideoThemeSnapshot(
    createVideoThemeLibrary([WARM]),
    "warm",
  );
  assert.deepEqual(
    snapshot.documents.map(({ id }) => id),
    ["warm"],
  );
});

test("a snapshot resolves the item override before its patches", () => {
  const snapshot = addPatchesToVideoThemeSnapshot(
    createVideoThemeSnapshot(createVideoThemeLibrary([WARM]), "warm"),
    [RED_GROUND],
  );
  assert.equal(
    resolveVideoThemeFromSnapshot(snapshot, ["shared-object-handoff"]).semantic
      .color.ground,
    "#330000",
  );
});

test("the same snapshot and overrides give the same source object", () => {
  assert.equal(
    createVideoThemeSourceFromSnapshot(CLASSIC_VIDEO_THEME_SNAPSHOT, [
      "occlusion-wipe",
    ]),
    createVideoThemeSourceFromSnapshot(CLASSIC_VIDEO_THEME_SNAPSHOT, [
      "occlusion-wipe",
    ]),
  );
});

test("adding no patches returns the same snapshot", () => {
  assert.equal(
    addPatchesToVideoThemeSnapshot(CLASSIC_VIDEO_THEME_SNAPSHOT, []),
    CLASSIC_VIDEO_THEME_SNAPSHOT,
  );
});
