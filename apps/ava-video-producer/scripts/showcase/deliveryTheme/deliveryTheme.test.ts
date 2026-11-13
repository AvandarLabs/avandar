import assert from "node:assert/strict";
import test from "node:test";
import { resolveVideoThemeFromSnapshot } from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { getDeliveryThemeFromFilm } from "./deliveryTheme";

test("a film without a theme records classic and classic's hash", () => {
  assert.deepEqual(getDeliveryThemeFromFilm({ id: "occlusion-wipe" }), {
    themeId: "classic",
    themeHash: resolveVideoThemeFromSnapshot(undefined, ["occlusion-wipe"])
      .hash,
  });
});

test("a themed film records the hash of what it rendered", () => {
  const theme = { themeId: "avandar", documents: [], patches: [] };
  assert.notEqual(
    getDeliveryThemeFromFilm({ id: "occlusion-wipe", theme }).themeHash,
    getDeliveryThemeFromFilm({ id: "occlusion-wipe" }).themeHash,
  );
});
