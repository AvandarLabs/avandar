import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../builtInVideoThemes/builtInVideoThemes";
import { createScopedVideoThemeSource } from "./createScopedVideoThemeSource";

test("a nested override ranks below the outer one", () => {
  const outer = {
    ...DEFAULT_VIDEO_THEME_SOURCE,
    scope: { overrideIds: ["aperture-detail"] },
  };
  const inner = createScopedVideoThemeSource(outer, {
    overrideIds: ["network-graph"],
  });
  assert.deepEqual(inner.scope?.overrideIds, [
    "network-graph",
    "aperture-detail",
  ]);
});

test("inner patches apply after outer patches", () => {
  const outer = {
    ...DEFAULT_VIDEO_THEME_SOURCE,
    scope: { patches: [{ a: 1 }] },
  };
  const inner = createScopedVideoThemeSource(outer, { patches: [{ b: 2 }] });
  assert.deepEqual(inner.scope?.patches, [{ a: 1 }, { b: 2 }]);
});
