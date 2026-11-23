import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { makeScopedVideoThemeSourceFromScopes } from "../makeScopedVideoThemeSourceFromScopes/makeScopedVideoThemeSourceFromScopes";

test("a nested override ranks below the outer one", () => {
  const outer = {
    ...DEFAULT_VIDEO_THEME_SOURCE,
    scope: { overrideIds: ["aperture-detail"] },
  };
  const inner = makeScopedVideoThemeSourceFromScopes({
    outer,
    inner: {
      overrideIds: ["network-graph"],
    },
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
  const inner = makeScopedVideoThemeSourceFromScopes({
    outer,
    inner: { patches: [{ b: 2 }] },
  });
  assert.deepEqual(inner.scope?.patches, [{ a: 1 }, { b: 2 }]);
});
