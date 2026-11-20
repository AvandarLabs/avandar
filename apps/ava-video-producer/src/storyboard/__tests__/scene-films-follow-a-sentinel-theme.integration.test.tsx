/** @jsxRuntime automatic */
/*
 * Storyboard scene films draw from the video theme: each scene study and
 * scene film in the catalog renders under the shared sentinel theme
 * (`tests/helpers/SentinelVideoTheme.ts`), and its markup must then hold no
 * `classic` value. Plan and shot field colours name theme swatches, so they
 * move too. Every film is checked as authored and again with its appearance
 * options off, which draws the branches camera motion, motion blur, and
 * annotations otherwise hide.
 */
import "../../../tests/helpers/registerRemotionTestHooks";
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SentinelVideoTheme } from "../../../tests/helpers/SentinelVideoTheme/SentinelVideoTheme";
import type { Storyboard } from "../schema/schema";
import type { ReactNode } from "react";
// Loaded after the hooks register: static imports load before any module
// runs, so a renderer reached through one would get the real Remotion.
const { CONTINUITY_CATALOG } =
  await import("../../continuity/continuityCatalog");
const { BUILT_IN_VIDEO_THEMES } =
  await import("../../videoTheme/builtInVideoThemes/builtInVideoThemes");
const { VideoThemeScope } =
  await import("../../videoTheme/VideoThemeScope/VideoThemeScope");
const { storyboardSchema, timeline } = await import("../schema/schema");
const { makeResolvedVideoThemeFromLibrary } =
  await import("../../videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary");
const { createContinuityPlanFromOptions } =
  await import("../../continuity/continuityAppearance");
const { createContinuityPlanFromVideoTheme } =
  await import("../../continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme");
const { StoryFilmPicture } = await import("../StoryFilm/StoryFilmPicture");
const SCENE_FILMS = CONTINUITY_CATALOG.map((entry) => {
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
      shot.endFrame - 2,
    ];
  });
}
/**
 * Product reenactment is exempt footage: the real product draws it with the
 * product's own palette. The test stands an empty box in for it.
 */
function ProductPlaceholder(): ReactNode {
  return <div data-product-placeholder="" />;
}
/** The plan as its film draws it: continuity shots read the theme. */
function _createThemedPlan({
  id,
  plan,
}: Readonly<{
  id: string;
  plan: Storyboard;
}>): Storyboard {
  const theme = makeResolvedVideoThemeFromLibrary(
    BUILT_IN_VIDEO_THEMES,
    "classic",
    { overrideIds: [id], patches: [SentinelVideoTheme.SENTINEL_THEME] },
  );
  return createContinuityPlanFromVideoTheme(plan, theme);
}
/** The classic values a themed plan draws over its sample frames. */
function _filmFindings({
  id,
  themedPlan,
  frames,
}: Readonly<{
  id: string;
  themedPlan: Storyboard;
  frames: readonly number[];
}>): string[] {
  return SentinelVideoTheme.findClassicValuesAcrossFrames({
    frames,
    render: (frame) => {
      (
        globalThis as {
          __testFrame?: number;
        }
      ).__testFrame = frame;
      return renderToStaticMarkup(
        <VideoThemeScope
          overrideIds={[id]}
          patches={[SentinelVideoTheme.SENTINEL_THEME]}
          element="div"
        >
          <StoryFilmPicture
            plan={themedPlan}
            frame={frame}
            productScene={ProductPlaceholder}
          />
        </VideoThemeScope>,
      );
    },
  });
}
test("compositions and sample films draw no classic value under the sentinel theme", () => {
  assert.deepEqual(
    SCENE_FILMS.flatMap(({ id, plan }) => {
      const themedPlan = _createThemedPlan({ id, plan });
      return _filmFindings({
        id,
        themedPlan,
        frames: _sampleFrames(themedPlan),
      }).map((value) => {
        return `${id}: ${value}`;
      });
    }),
    [],
  );
});
test("compositions and sample films with their appearance options off draw no classic value", () => {
  assert.deepEqual(
    SCENE_FILMS.flatMap(({ id, plan }) => {
      const themedPlan = _createThemedPlan({
        id,
        plan: createContinuityPlanFromOptions(plan, {
          cameraMotion: false,
          motionBlur: false,
          annotations: false,
        }),
      });
      const middles = timeline(themedPlan).map((shot) => {
        return shot.startFrame + Math.floor(shot.durationInFrames / 2);
      });
      return _filmFindings({ id, themedPlan, frames: middles }).map((value) => {
        return `${id} (options off): ${value}`;
      });
    }),
    [],
  );
});
