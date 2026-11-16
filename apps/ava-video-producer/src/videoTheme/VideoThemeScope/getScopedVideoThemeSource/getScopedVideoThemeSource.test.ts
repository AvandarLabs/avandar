import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../builtInVideoThemes/builtInVideoThemes";
import { getScopedVideoThemeSource } from "./getScopedVideoThemeSource";

test("equal nested scopes share one source object", () => {
  const inner = { overrideIds: ["network-graph"] };
  assert.equal(
    getScopedVideoThemeSource(DEFAULT_VIDEO_THEME_SOURCE, inner),
    getScopedVideoThemeSource(DEFAULT_VIDEO_THEME_SOURCE, {
      overrideIds: ["network-graph"],
    }),
  );
});

test("different nested scopes get different sources", () => {
  assert.notEqual(
    getScopedVideoThemeSource(DEFAULT_VIDEO_THEME_SOURCE, {
      overrideIds: ["network-graph"],
    }),
    getScopedVideoThemeSource(DEFAULT_VIDEO_THEME_SOURCE, {
      overrideIds: ["radial-network"],
    }),
  );
});
