import assert from "node:assert/strict";
import test from "node:test";
import { createVideoThemeLibrary } from "../builtInVideoThemes/builtInVideoThemes";
import { getValueAtPath } from "../getValueAtPath";
import { mergeVideoThemeLayers } from "./mergeVideoThemeLayers";
import type { VideoThemeDocument } from "../videoTheme.types";

function _theme(
  id: string,
  base: string,
  extra: Partial<VideoThemeDocument> = {},
): VideoThemeDocument {
  return { schemaVersion: 1, id, label: id, extends: base, ...extra };
}

function _swatch(name: string, color: string) {
  return { other: { video: { atomic: { swatch: { [name]: color } } } } };
}

function _ground(patch: object): unknown {
  return getValueAtPath(patch, [
    "other",
    "video",
    "atomic",
    "swatch",
    "ground",
  ]);
}

const STUDIO = _theme("studio", "classic", {
  ..._swatch("ground", "#201510"),
  overrides: {
    "data-pipeline": _swatch("ground", "#111111"),
    "shared-object-handoff": _swatch("ground", "#222222"),
  },
});

test("a theme's values win over the theme it extends", () => {
  const merged = mergeVideoThemeLayers(
    createVideoThemeLibrary([STUDIO]),
    "studio",
  );
  assert.equal(_ground(merged), "#201510");
  assert.equal(
    getValueAtPath(merged, ["other", "video", "atomic", "swatch", "mint"]),
    "#9fefca",
  );
});

test("overrides apply in scope order, the last id winning", () => {
  const library = createVideoThemeLibrary([STUDIO]);
  const merged = mergeVideoThemeLayers(library, "studio", {
    overrideIds: ["data-pipeline", "shared-object-handoff"],
  });
  assert.equal(_ground(merged), "#222222");
});

test("overrides are not inherited through extends", () => {
  const library = createVideoThemeLibrary([STUDIO, _theme("child", "studio")]);
  const merged = mergeVideoThemeLayers(library, "child", {
    overrideIds: ["data-pipeline"],
  });
  assert.equal(_ground(merged), "#201510");
});

test("patches apply after overrides", () => {
  const library = createVideoThemeLibrary([STUDIO]);
  const merged = mergeVideoThemeLayers(library, "studio", {
    overrideIds: ["data-pipeline"],
    patches: [_swatch("ground", "#333333")],
  });
  assert.equal(_ground(merged), "#333333");
});

test("an extends cycle is reported", () => {
  const library = createVideoThemeLibrary([_theme("a", "b"), _theme("b", "a")]);
  assert.throws(() => mergeVideoThemeLayers(library, "a"), /extends itself/);
});

test("an unknown extends target is reported", () => {
  const library = createVideoThemeLibrary([_theme("orphan", "missing")]);
  assert.throws(
    () => mergeVideoThemeLayers(library, "orphan"),
    /Unknown theme "missing"/,
  );
});

test("an object patch replaces a reference instead of merging into it", () => {
  const box = {
    roughness: "$atomic.roughness.rough",
    bowing: "$atomic.bowing.md",
    seed: "$atomic.seed.md",
    randomness: "$atomic.randomness.md",
  };
  const rough = _theme("rough", "classic", {
    other: { video: { semantic: { sketch: { box } } } },
  });
  const merged = mergeVideoThemeLayers(
    createVideoThemeLibrary([rough]),
    "rough",
  );
  assert.deepEqual(
    getValueAtPath(merged, ["other", "video", "semantic", "sketch", "box"]),
    box,
  );
});
