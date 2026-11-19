/** @jsxRuntime automatic */
/*
 * The fixed compositions and the helper previews draw from the video theme.
 * `Demo`, `MotionLab`, and `TitleStudy` render in `starter`, and every helper
 * preview in `classic`, under the shared sentinel theme
 * (`tests/helpers/sentinelVideoTheme.ts`). Their markup must then hold no
 * `classic` or product palette colour, stroke, radius, dash, or opacity
 * step, and no starter palette `var(--…)` read.
 */
import "../../../tests/helpers/registerRemotionTestHooks";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import {
  findClassicValuesInMarkup,
  SENTINEL_THEME,
} from "../../../tests/helpers/sentinelVideoTheme";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { VideoThemeProvider } from "../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { createStarterVideoThemeSource } from "../StarterVideoTheme/createStarterVideoThemeSource";
import type { ComponentType } from "react";

const { Demo } = await import("../Demo/Demo");
const { MotionLab } = await import("../MotionLab");
const { TitleStudy } = await import("../TitleStudy");
const { HelperComposition } =
  await import("../../gallery/HelperGallery/HelperPlayer/HelperComposition");
const { HELPER_CATALOG } =
  await import("../../gallery/HelperGallery/helperCatalog");
/**
 * The product palette, read from the workspace theme the way the Atlas
 * build reads it. No helper preview may draw a product colour.
 */
const PRODUCT_COLORS: unknown = JSON.parse(
  execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      fileURLToPath(
        new URL("../../../scripts/read-theme.mjs", import.meta.url),
      ),
    ],
    { encoding: "utf8" },
  ),
);

const STARTER_NAMES =
  /var\(--(?:brand|brand-soft|brand-strong|ground|foreground|background|card|muted|muted-foreground|border|shadow)\)/g;

/**
 * The classic values a markup string still holds, one line each, plus any
 * starter palette `var(--…)` read.
 */
function _findClassicValues(markup: string): string[] {
  const starterReads = [...markup.matchAll(STARTER_NAMES)].map(([read]) => {
    return read;
  });
  return [
    ...new Set([
      ...findClassicValuesInMarkup(markup, { extraColors: PRODUCT_COLORS }),
      ...starterReads,
    ]),
  ];
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
