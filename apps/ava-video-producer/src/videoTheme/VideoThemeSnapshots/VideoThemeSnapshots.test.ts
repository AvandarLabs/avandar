import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { makeVideoThemeLibraryFromDocuments } from "../makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import {
  CLASSIC_VIDEO_THEME_SNAPSHOT,
  VideoThemeSnapshots,
} from "./VideoThemeSnapshots";
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
  const theme = VideoThemeSnapshots.toResolvedTheme({
    snapshot: undefined,
    overrideIds: [],
  });
  assert.equal(theme.id, "classic");
});

test("a snapshot keeps the theme and the custom themes it extends, without built-ins", () => {
  const snapshot = VideoThemeSnapshots.fromLibrary({
    library: makeVideoThemeLibraryFromDocuments([WARM]),
    themeId: "warm",
  });
  assert.deepEqual(snapshot.documents.map(prop("id")), ["warm"]);
});

test("a snapshot resolves the item override before its patches", () => {
  const snapshot = VideoThemeSnapshots.addPatches({
    snapshot: VideoThemeSnapshots.fromLibrary({
      library: makeVideoThemeLibraryFromDocuments([WARM]),
      themeId: "warm",
    }),
    patches: [RED_GROUND],
  });
  assert.equal(
    VideoThemeSnapshots.toResolvedTheme({
      snapshot,
      overrideIds: ["shared-object-handoff"],
    }).semantic.color.ground,
    "#330000",
  );
});

test("the same snapshot and overrides give the same source object", () => {
  assert.equal(
    VideoThemeSnapshots.toSource({
      snapshot: CLASSIC_VIDEO_THEME_SNAPSHOT,
      overrideIds: ["occlusion-wipe"],
    }),
    VideoThemeSnapshots.toSource({
      snapshot: CLASSIC_VIDEO_THEME_SNAPSHOT,
      overrideIds: ["occlusion-wipe"],
    }),
  );
});

test("adding no patches returns the same snapshot", () => {
  assert.equal(
    VideoThemeSnapshots.addPatches({
      snapshot: CLASSIC_VIDEO_THEME_SNAPSHOT,
      patches: [],
    }),
    CLASSIC_VIDEO_THEME_SNAPSHOT,
  );
});
