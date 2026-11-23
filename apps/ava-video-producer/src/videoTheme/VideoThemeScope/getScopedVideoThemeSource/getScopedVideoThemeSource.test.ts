import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { getScopedVideoThemeSource } from "./getScopedVideoThemeSource";

test("equal nested scopes share one source object", () => {
  const inner = { overrideIds: ["network-graph"] };
  assert.equal(
    getScopedVideoThemeSource({
      outer: DEFAULT_VIDEO_THEME_SOURCE,
      inner,
    }),
    getScopedVideoThemeSource({
      outer: DEFAULT_VIDEO_THEME_SOURCE,
      inner: {
        overrideIds: ["network-graph"],
      },
    }),
  );
});
test("different nested scopes get different sources", () => {
  assert.notEqual(
    getScopedVideoThemeSource({
      outer: DEFAULT_VIDEO_THEME_SOURCE,
      inner: {
        overrideIds: ["network-graph"],
      },
    }),
    getScopedVideoThemeSource({
      outer: DEFAULT_VIDEO_THEME_SOURCE,
      inner: {
        overrideIds: ["radial-network"],
      },
    }),
  );
});
