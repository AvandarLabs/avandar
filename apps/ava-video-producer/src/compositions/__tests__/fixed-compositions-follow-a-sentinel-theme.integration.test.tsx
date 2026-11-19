/** @jsxRuntime automatic */
/*
 * The fixed compositions and the helper previews draw from the video theme.
 * `Demo`, `MotionLab`, and `TitleStudy` render in `starter`, and every helper
 * preview in `classic`, under a patch that moves every swatch, palette shade,
 * white, black, radius, stroke width, and multiplier to an improbable value.
 * Their markup must then hold no `classic` or product palette colour, no
 * starter palette `var(--…)` read, and no `classic` radius or border width.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { getValueAtPath } from "../../videoTheme/getValueAtPath";
import { VideoThemeProvider } from "../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { createStarterVideoThemeSource } from "../StarterVideoTheme/createStarterVideoThemeSource";
import type { VideoThemePatch } from "../../videoTheme/videoTheme.types";
import type { ComponentType } from "react";

/**
 * Remotion's frame hook needs a registered composition, and Node cannot load
 * CSS modules. Source outside `node_modules` gets a `remotion` whose frame
 * comes from a global the test sets, the macOS cursor (a product asset, not a
 * theme value) draws an empty `svg`, and CSS modules load as class names.
 */
const REMOTION_STUB = `
import React from ${JSON.stringify(import.meta.resolve("react"))};
export * from ${JSON.stringify(import.meta.resolve("remotion"))};
const FrameOffset = React.createContext(0);
export const useCurrentFrame = () =>
  globalThis.__testFrame - React.useContext(FrameOffset);
export const useVideoConfig = () =>
  ({ fps: 30, width: 1600, height: 1000, durationInFrames: 600, id: "test" });
export const Sequence = ({ from = 0, children }) => {
  const offset = React.useContext(FrameOffset);
  return globalThis.__testFrame - offset < from
    ? null
    : React.createElement(FrameOffset.Provider, { value: offset + from }, children);
};
export const Img = (props) => React.createElement("img", props);
export const OffthreadVideo = (props) =>
  React.createElement("video", { src: props.src, style: props.style });
`;
const CURSOR_STUB = `
import React from ${JSON.stringify(import.meta.resolve("react"))};
export const MacOSCursor = () => React.createElement("svg");
`;
const MOTION_BLUR_STUB = `
import React from ${JSON.stringify(import.meta.resolve("react"))};
export const CameraMotionBlur = (props) =>
  React.createElement(React.Fragment, null, props.children);
`;
const TEST_HOOKS = `
const REMOTION_STUB_URL = ${JSON.stringify(
  `data:text/javascript,${encodeURIComponent(REMOTION_STUB)}`,
)};
const CURSOR_STUB_URL = ${JSON.stringify(
  `data:text/javascript,${encodeURIComponent(CURSOR_STUB)}`,
)};
const MOTION_BLUR_STUB_URL = ${JSON.stringify(
  `data:text/javascript,${encodeURIComponent(MOTION_BLUR_STUB)}`,
)};
export async function resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? "";
  if (specifier === "@remotion/mac-cursors") {
    return { url: CURSOR_STUB_URL, shortCircuit: true };
  }
  if (specifier === "@remotion/motion-blur") {
    return { url: MOTION_BLUR_STUB_URL, shortCircuit: true };
  }
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
register(`data:text/javascript,${encodeURIComponent(TEST_HOOKS)}`);
const { Demo } = await import("../Demo/Demo");
const { MotionLab } = await import("../MotionLab");
const { TitleStudy } = await import("../TitleStudy");
const { HelperComposition } =
  await import("../../gallery/HelperGallery/HelperPlayer/HelperComposition");
const { HELPER_CATALOG } =
  await import("../../gallery/HelperGallery/helperCatalog");
/**
 * The product palette helper previews used to draw with. It is generated
 * into the gallery by the motion gallery build, so a fresh checkout may not
 * have it yet.
 */
const PRODUCT_COLORS_FILE = new URL(
  "../../gallery/theme-colors.json",
  import.meta.url,
);
const PRODUCT_COLORS: unknown = fs.existsSync(PRODUCT_COLORS_FILE)
  ? JSON.parse(fs.readFileSync(PRODUCT_COLORS_FILE, "utf8"))
  : {};

const CLASSIC = BUILT_IN_VIDEO_THEMES.get("classic");
const SENTINEL_STROKE = 0.7;
const SENTINEL_RADIUS = 7;
const SENTINEL_MULTIPLIER = 1.37;

function _record(path: readonly string[]): Readonly<Record<string, unknown>> {
  const value = getValueAtPath(CLASSIC, path);
  return typeof value === "object" && value !== null
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}

function _sentinelColor(index: number): string {
  return `#${(0x3a1f00 + index * 7).toString(16).padStart(6, "0")}`;
}

function _mapKeys(
  path: readonly string[],
  value: (index: number) => unknown,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(_record(path)).map((key, index) => {
      return [key, value(index)];
    }),
  );
}

/** Every hex string anywhere in a JSON value. */
function _hexStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return /^#[0-9a-fA-F]{3,8}$/.test(value) ? [value] : [];
  }
  return typeof value === "object" && value !== null
    ? Object.values(value).flatMap(_hexStrings)
    : [];
}

/**
 * Every classic swatch, palette shade, white, and black, plus the product
 * palette helper previews used to draw with, lowercased.
 */
const CLASSIC_COLORS = new Set(
  [
    ..._hexStrings(PRODUCT_COLORS),
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
const CLASSIC_RADII = new Set(
  Object.values(_record(["radius"])).map((value) => {
    return String(value).replace("px", "");
  }),
);
const CLASSIC_STROKES = new Set(
  Object.values(_record(["other", "video", "atomic", "strokeWidth"])).map(
    String,
  ),
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
  radius: _mapKeys(["radius"], () => {
    return `${SENTINEL_RADIUS}px`;
  }),
  other: {
    video: {
      atomic: {
        swatch: _mapKeys(["other", "video", "atomic", "swatch"], (index) => {
          return _sentinelColor(index);
        }),
        strokeWidth: _mapKeys(
          ["other", "video", "atomic", "strokeWidth"],
          () => {
            return SENTINEL_STROKE;
          },
        ),
        multiplier: { identity: SENTINEL_MULTIPLIER },
      },
    },
  },
};

const STARTER_NAMES =
  /var\(--(?:brand|brand-soft|brand-strong|ground|foreground|background|card|muted|muted-foreground|border|shadow)\)/g;

/** The classic values a markup string still holds, one line each. */
function _findClassicValues(markup: string): string[] {
  const colors = [...markup.matchAll(/#[0-9a-fA-F]{3,8}\b/g)]
    .map(([color]) => {
      return color.toLowerCase();
    })
    .filter((color) => {
      return CLASSIC_COLORS.has(color);
    });
  const starterReads = [...markup.matchAll(STARTER_NAMES)].map(([read]) => {
    return read;
  });
  const radii = [...markup.matchAll(/border-radius:([\d.]+)px/g)]
    .filter(([, radius]) => {
      return CLASSIC_RADII.has(radius!);
    })
    .map(([read]) => {
      return read;
    });
  const borders = [...markup.matchAll(/border(?:-\w+)?:([\d.]+)px/g)]
    .filter(([, width]) => {
      return CLASSIC_STROKES.has(width!);
    })
    .map(([read]) => {
      return read;
    });
  return [...new Set([...colors, ...starterReads, ...radii, ...borders])];
}

const COMPOSITIONS: ReadonlyArray<
  Readonly<{ id: string; component: ComponentType; frames: number }>
> = [
  { id: "demo", component: Demo, frames: 414 },
  { id: "motion-lab", component: MotionLab, frames: 294 },
  { id: "title-study", component: TitleStudy, frames: 252 },
];

function _renderAt(id: string, Composition: ComponentType, frame: number) {
  (globalThis as { __testFrame?: number }).__testFrame = frame;
  const source = createStarterVideoThemeSource(id);
  return renderToStaticMarkup(
    <VideoThemeProvider
      source={{
        ...source,
        scope: { ...source.scope, patches: [SENTINEL_THEME] },
      }}
    >
      <Composition />
    </VideoThemeProvider>,
  );
}

test("fixed compositions draw no classic value under the sentinel theme", () => {
  assert.deepEqual(
    COMPOSITIONS.flatMap(({ id, component, frames }) => {
      const markup = Array.from({ length: 12 }, (_, index) => {
        return _renderAt(
          id,
          component,
          Math.round((index * (frames - 1)) / 11),
        );
      }).join("");
      return _findClassicValues(markup).map((value) => {
        return `${id}: ${value}`;
      });
    }),
    [],
  );
});

function _renderHelperAt(helperId: string, frame: number) {
  (globalThis as { __testFrame?: number }).__testFrame = frame;
  return renderToStaticMarkup(
    <VideoThemeProvider
      source={{
        library: BUILT_IN_VIDEO_THEMES,
        themeId: "classic",
        scope: { patches: [SENTINEL_THEME] },
      }}
    >
      <HelperComposition helperId={helperId} />
    </VideoThemeProvider>,
  );
}

test("helper previews draw no classic or product value under the sentinel theme", () => {
  assert.deepEqual(
    HELPER_CATALOG.helpers.flatMap((helper) => {
      const last = helper.demo.frames - 1;
      const markup = [0, Math.round(last / 3), Math.round((last * 2) / 3), last]
        .map((frame) => {
          return _renderHelperAt(helper.id, frame);
        })
        .join("");
      return _findClassicValues(markup).map((value) => {
        return `${helper.id}: ${value}`;
      });
    }),
    [],
  );
});
