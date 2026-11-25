import assert from "node:assert/strict";
import test from "node:test";
import { getValueAtPath } from "../getValueAtPath";
import { makeVideoThemeLibraryFromDocuments } from "../makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { mergeVideoThemeLayers } from "./mergeVideoThemeLayers";
import type { VideoThemeDocument } from "../videoTheme.types";

function _theme({
  id,
  base,
  extra = {},
}: Readonly<{
  id: string;
  base: string;
  extra?: Partial<VideoThemeDocument>;
}>): VideoThemeDocument {
  return { schemaVersion: 1, id, label: id, extends: base, ...extra };
}
function _swatch({
  name,
  color,
}: Readonly<{
  name: string;
  color: string;
}>) {
  return { other: { video: { atomic: { swatch: { [name]: color } } } } };
}
function _ground(patch: object): unknown {
  return getValueAtPath({
    source: patch,
    path: ["other", "video", "atomic", "swatch", "ground"],
  });
}
const STUDIO = _theme({
  id: "studio",
  base: "classic",
  extra: {
    ..._swatch({
      name: "ground",
      color: "#201510",
    }),
    overrides: {
      "data-pipeline": _swatch({
        name: "ground",
        color: "#111111",
      }),
      "shared-object-handoff": _swatch({
        name: "ground",
        color: "#222222",
      }),
    },
  },
});
test("a theme's values win over the theme it extends", () => {
  const merged = mergeVideoThemeLayers({
    library: makeVideoThemeLibraryFromDocuments([STUDIO]),
    themeId: "studio",
  });
  assert.equal(_ground(merged), "#201510");
  assert.equal(
    getValueAtPath({
      source: merged,
      path: ["other", "video", "atomic", "swatch", "mint"],
    }),
    "#9fefca",
  );
});
test("overrides apply in scope order, the last id winning", () => {
  const library = makeVideoThemeLibraryFromDocuments([STUDIO]);
  const merged = mergeVideoThemeLayers({
    library,
    themeId: "studio",
    scope: {
      overrideIds: ["data-pipeline", "shared-object-handoff"],
    },
  });
  assert.equal(_ground(merged), "#222222");
});
test("overrides are not inherited through extends", () => {
  const library = makeVideoThemeLibraryFromDocuments([
    STUDIO,
    _theme({
      id: "child",
      base: "studio",
    }),
  ]);
  const merged = mergeVideoThemeLayers({
    library,
    themeId: "child",
    scope: {
      overrideIds: ["data-pipeline"],
    },
  });
  assert.equal(_ground(merged), "#201510");
});
test("patches apply after overrides", () => {
  const library = makeVideoThemeLibraryFromDocuments([STUDIO]);
  const merged = mergeVideoThemeLayers({
    library,
    themeId: "studio",
    scope: {
      overrideIds: ["data-pipeline"],
      patches: [
        _swatch({
          name: "ground",
          color: "#333333",
        }),
      ],
    },
  });
  assert.equal(_ground(merged), "#333333");
});
test("an object patch replaces a reference instead of merging into it", () => {
  const box = {
    roughness: "$atomic.roughness.rough",
    bowing: "$atomic.bowing.md",
    seed: "$atomic.seed.md",
    randomness: "$atomic.randomness.md",
  };
  const rough = _theme({
    id: "rough",
    base: "classic",
    extra: {
      other: { video: { semantic: { sketch: { box } } } },
    },
  });
  const merged = mergeVideoThemeLayers({
    library: makeVideoThemeLibraryFromDocuments([rough]),
    themeId: "rough",
  });
  assert.deepEqual(
    getValueAtPath({
      source: merged,
      path: ["other", "video", "semantic", "sketch", "box"],
    }),
    box,
  );
});
