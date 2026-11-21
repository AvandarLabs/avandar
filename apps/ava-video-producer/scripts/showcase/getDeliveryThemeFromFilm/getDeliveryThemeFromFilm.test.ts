import assert from "node:assert/strict";
import test from "node:test";
import { makeSnapshotFromThemeRequest } from "../../../src/videoTheme/makeSnapshotFromThemeRequest";
import {
  BUILT_IN_VIDEO_THEMES,
  makeVideoThemeLibraryFromDocuments,
} from "../../../src/videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { VideoThemeSnapshots } from "../../../src/videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import { getDeliveryThemeFromFilm } from "./getDeliveryThemeFromFilm";
import type { VideoThemeDocument } from "../../../src/videoTheme/videoTheme.types";

const GROUND = {
  other: { video: { atomic: { swatch: { ground: "#201510" } } } },
};
const WARM: VideoThemeDocument = {
  schemaVersion: 1,
  id: "warm",
  label: "Warm",
  extends: "classic",
};
test("a film without a theme records classic and classic's hash", () => {
  assert.deepEqual(getDeliveryThemeFromFilm({ id: "occlusion-wipe" }), {
    themeId: "classic",
    themeHash: VideoThemeSnapshots.toResolvedTheme({
      snapshot: undefined,
      overrideIds: ["occlusion-wipe"],
    }).hash,
  });
});
test("a themed film records the hash of what it rendered", () => {
  const theme = { themeId: "avandar", documents: [], patches: [] };
  assert.notEqual(
    getDeliveryThemeFromFilm({ id: "occlusion-wipe", theme }).themeHash,
    getDeliveryThemeFromFilm({ id: "occlusion-wipe" }).themeHash,
  );
});
test("a built-in theme's draft records the built-in it extends and marks the draft", () => {
  const theme = makeSnapshotFromThemeRequest({
    library: BUILT_IN_VIDEO_THEMES,
    id: "avandar",
    patch: GROUND,
  });
  const delivery = getDeliveryThemeFromFilm({ id: "occlusion-wipe", theme });
  assert.deepEqual([delivery.themeId, delivery.themeDraft], ["avandar", true]);
});
test("a custom theme's draft records the custom theme and marks the draft", () => {
  const theme = VideoThemeSnapshots.fromLibrary({
    library: makeVideoThemeLibraryFromDocuments([WARM]),
    themeId: "warm",
    patches: [GROUND],
  });
  const delivery = getDeliveryThemeFromFilm({ id: "occlusion-wipe", theme });
  assert.deepEqual([delivery.themeId, delivery.themeDraft], ["warm", true]);
});
test("a saved theme records no draft", () => {
  const theme = { themeId: "avandar", documents: [], patches: [] };
  assert.equal(
    "themeDraft" in getDeliveryThemeFromFilm({ id: "occlusion-wipe", theme }),
    false,
  );
});
test("a custom theme sent with an empty patch is marked as a draft", () => {
  const theme = makeSnapshotFromThemeRequest({
    library: makeVideoThemeLibraryFromDocuments([WARM]),
    id: "warm",
    patch: {},
  });
  const delivery = getDeliveryThemeFromFilm({ id: "occlusion-wipe", theme });
  assert.deepEqual([delivery.themeId, delivery.themeDraft], ["warm", true]);
});
