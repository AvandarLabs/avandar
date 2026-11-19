/** @jsxRuntime automatic */
/*
 * Storyboard scene films draw every colour from the video theme: each scene
 * study and scene film in the catalog renders under a theme that moves every
 * swatch, palette shade, white, and black to an improbable colour, and its
 * markup must then hold no `classic` colour. Plan and shot field colours
 * name theme swatches, so they move too.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CONTINUITY_CATALOG,
  isSceneEntry,
} from "../../continuity/continuityCatalog";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { getValueAtPath } from "../../videoTheme/getValueAtPath";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import { storyboardSchema, timeline } from "../schema/schema";
import type { VideoThemePatch } from "../../videoTheme/videoTheme.types";
import type { Storyboard } from "../schema/schema";

/**
 * Node cannot load the stage's CSS modules, and Remotion's media components
 * need a registered composition. The film's markup is what the test reads,
 * so each CSS module loads as class names equal to their keys, and stage
 * source gets Remotion with plain `img` and `video` elements.
 */
const REMOTION_STUB = `
import React from ${JSON.stringify(import.meta.resolve("react"))};
export * from ${JSON.stringify(import.meta.resolve("remotion"))};
export const Img = (props) => React.createElement("img", props);
export const OffthreadVideo = (props) =>
  React.createElement("video", { src: props.src, style: props.style });
export const Freeze = (props) =>
  React.createElement(React.Fragment, null, props.children);
`;
const STAGE_TEST_HOOKS = `
const REMOTION_STUB_URL = ${JSON.stringify(
  `data:text/javascript,${encodeURIComponent(REMOTION_STUB)}`,
)};
export async function resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? "";
  if (
    specifier === "remotion" &&
    parent.startsWith("file:") &&
    !parent.includes("/node_modules/")
  ) {
    return { url: REMOTION_STUB_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.endsWith(".css")) {
    return {
      format: "module",
      shortCircuit: true,
      source: "export default new Proxy({}, { get: (_, key) => String(key) });",
    };
  }
  return nextLoad(url, context);
}`;
register(`data:text/javascript,${encodeURIComponent(STAGE_TEST_HOOKS)}`);
const { StoryFilmPicture } = await import("../StoryFilm/StoryFilm");

const CLASSIC = BUILT_IN_VIDEO_THEMES.get("classic");

function _record(path: readonly string[]): Readonly<Record<string, unknown>> {
  const value = getValueAtPath(CLASSIC, path);
  return typeof value === "object" && value !== null
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}

function _sentinelColor(index: number): string {
  return `#${(0x3a1f00 + index * 7).toString(16).padStart(6, "0")}`;
}

/** Every classic swatch, palette shade, white, and black, lowercased. */
const CLASSIC_COLORS = new Set(
  [
    ...Object.values(_record(["other", "video", "atomic", "swatch"])),
    ...Object.values(_record(["colors"])).flat(),
    getValueAtPath(CLASSIC, ["white"]),
    getValueAtPath(CLASSIC, ["black"]),
  ]
    .filter((value): value is string => {
      return typeof value === "string";
    })
    .map((value) => {
      return value.toLowerCase();
    }),
);

const SENTINEL_THEME: VideoThemePatch = {
  colors: Object.fromEntries(
    Object.keys(_record(["colors"])).map((name, paletteIndex) => {
      return [
        name,
        Array.from({ length: 10 }, (_, shade) => {
          return _sentinelColor(100 + paletteIndex * 10 + shade);
        }),
      ];
    }),
  ),
  white: _sentinelColor(200),
  black: _sentinelColor(201),
  other: {
    video: {
      atomic: {
        swatch: Object.fromEntries(
          Object.keys(_record(["other", "video", "atomic", "swatch"])).map(
            (name, index) => {
              return [name, _sentinelColor(index)];
            },
          ),
        ),
      },
    },
  },
};

const SCENE_FILMS = CONTINUITY_CATALOG.filter(isSceneEntry).map((entry) => {
  const plan: Storyboard = storyboardSchema.parse(
    JSON.parse(
      fs.readFileSync(
        new URL(`../../../storyboards/${entry.path}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );
  return { id: entry.id, plan };
});

/** The first, middle, and last frame of every shot. */
function _sampleFrames(plan: Storyboard): number[] {
  return timeline(plan).flatMap((shot) => {
    return [
      shot.startFrame,
      shot.startFrame + Math.floor(shot.durationInFrames / 2),
      shot.endFrame - 1,
    ];
  });
}

function _findClassicColors(markup: string): string[] {
  return [
    ...new Set(
      [...markup.matchAll(/#[0-9a-fA-F]{3,8}\b/g)]
        .map(([color]) => {
          return color.toLowerCase();
        })
        .filter((color) => {
          return CLASSIC_COLORS.has(color);
        }),
    ),
  ];
}

test("the catalog has scene films to check", () => {
  assert.ok(SCENE_FILMS.length >= 13);
});

test("scene films draw no classic colour under the sentinel theme", () => {
  assert.deepEqual(
    SCENE_FILMS.flatMap(({ id, plan }) => {
      const markup = _sampleFrames(plan)
        .map((frame) => {
          return renderToStaticMarkup(
            <VideoThemeScope patches={[SENTINEL_THEME]} element="div">
              <StoryFilmPicture plan={plan} frame={frame} />
            </VideoThemeScope>,
          );
        })
        .join("");
      return _findClassicColors(markup).map((color) => {
        return `${id}: ${color}`;
      });
    }),
    [],
  );
});
