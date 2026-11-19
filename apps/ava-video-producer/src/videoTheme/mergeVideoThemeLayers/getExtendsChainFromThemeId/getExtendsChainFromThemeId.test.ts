import assert from "node:assert/strict";
import test from "node:test";
import { createVideoThemeLibrary } from "../../builtInVideoThemes/builtInVideoThemes";
import { getExtendsChainFromThemeId } from "./getExtendsChainFromThemeId";
import type { VideoThemeDocument } from "../../videoTheme.types";

function _theme(id: string, base: string): VideoThemeDocument {
  return { schemaVersion: 1, id, label: id, extends: base };
}

test("the chain runs from the root theme to the requested one", () => {
  const library = createVideoThemeLibrary([
    _theme("studio", "classic"),
    _theme("child", "studio"),
  ]);
  assert.deepEqual(
    getExtendsChainFromThemeId(library, "child").map(({ id }) => {
      return id;
    }),
    ["classic", "studio", "child"],
  );
});

test("an extends cycle is reported", () => {
  const library = createVideoThemeLibrary([_theme("a", "b"), _theme("b", "a")]);
  assert.throws(() => {
    return getExtendsChainFromThemeId(library, "a");
  }, /extends itself/);
});

test("an unknown extends target is reported", () => {
  const library = createVideoThemeLibrary([_theme("orphan", "missing")]);
  assert.throws(() => {
    return getExtendsChainFromThemeId(library, "orphan");
  }, /Unknown theme "missing"/);
});
