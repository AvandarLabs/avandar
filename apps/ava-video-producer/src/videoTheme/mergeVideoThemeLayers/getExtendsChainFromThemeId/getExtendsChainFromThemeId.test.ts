import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { makeVideoThemeLibraryFromDocuments } from "../../makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { getExtendsChainFromThemeId } from "./getExtendsChainFromThemeId";
import type { VideoThemeDocument } from "../../videoTheme.types";

function _theme({
  id,
  base,
}: Readonly<{
  id: string;
  base: string;
}>): VideoThemeDocument {
  return { schemaVersion: 1, id, label: id, extends: base };
}

test("the chain runs from the root theme to the requested one", () => {
  const library = makeVideoThemeLibraryFromDocuments([
    _theme({
      id: "studio",
      base: "classic",
    }),
    _theme({
      id: "child",
      base: "studio",
    }),
  ]);
  assert.deepEqual(
    getExtendsChainFromThemeId({
      library,
      themeId: "child",
    }).map(prop("id")),
    ["classic", "studio", "child"],
  );
});

test("an extends cycle is reported", () => {
  const library = makeVideoThemeLibraryFromDocuments([
    _theme({
      id: "a",
      base: "b",
    }),
    _theme({
      id: "b",
      base: "a",
    }),
  ]);
  assert.throws(() => {
    return getExtendsChainFromThemeId({
      library,
      themeId: "a",
    });
  }, /extends itself/);
});

test("an unknown extends target is reported", () => {
  const library = makeVideoThemeLibraryFromDocuments([
    _theme({
      id: "orphan",
      base: "missing",
    }),
  ]);
  assert.throws(() => {
    return getExtendsChainFromThemeId({
      library,
      themeId: "orphan",
    });
  }, /Unknown theme "missing"/);
});
