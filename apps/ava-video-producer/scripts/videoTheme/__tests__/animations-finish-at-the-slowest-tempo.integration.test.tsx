/** @jsxRuntime automatic */
/*
 * At the slowest tempo (0.8) every in-scope animation still finishes
 * before its stock loop or continuity beat ends. Tempo stretches only
 * one-shot animations, never cue frames or repeating motion, so a stock
 * graphic has finished when its picture at the slowest tempo equals its
 * picture at tempo 1.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CONTINUITY_CATALOG } from "../../../src/continuity/continuityCatalog";
import { sampleStockFrame } from "../../../src/continuity/continuityTimeline";
import { getMotionDuration } from "../../../src/motion-components/motionSettings";
import { StockGraphic } from "../../../src/stock/StockGraphic/StockGraphic";
import { storyboardSchema } from "../../../src/storyboard/schema/schema";
import { BUILT_IN_VIDEO_THEMES } from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { createVideoMotion } from "../../../src/videoTheme/createVideoMotion/createVideoMotion";
import { makeResolvedVideoThemeFromLibrary } from "../../../src/videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { VideoThemeScope } from "../../../src/videoTheme/VideoThemeScope/VideoThemeScope";
import {
  PARITY_COMPOSITION_IDS,
  PARITY_STOCK_PRESET_IDS,
} from "../themeParity/parityTargets/parityTargets";
import type { ContinuityBeat } from "../../../src/continuity/continuitySchema";
import type { StockRequest } from "../../../src/stock/contracts/StockContract.types";
import type { VideoThemePatch } from "../../../src/videoTheme/videoTheme.types";

const SLOWEST_TEMPO: VideoThemePatch = {
  other: { video: { atomic: { tempo: { md: 0.8 } } } },
};
/** The last frame of a 180-frame stock loop. */
const LAST_LOOP_FRAME = 179;
/** Cue frames from `ContinuityToken`: the shared object fades in at 12 and an outline starts fading 60 frames into its beat. */
const SHARED_OBJECT_FADE_IN_AT = 12;
const OUTLINE_FADE_AT = 60;

const slowest = makeResolvedVideoThemeFromLibrary(
  BUILT_IN_VIDEO_THEMES,
  "classic",
  {
    patches: [SLOWEST_TEMPO],
  },
);
const motion = createVideoMotion(slowest.semantic.motion);

function _picture(
  request: StockRequest,
  frame: number,
  isSlowest: boolean,
): string {
  const graphic = <StockGraphic {...request} frame={frame} />;
  return renderToStaticMarkup(
    isSlowest ? (
      <VideoThemeScope patches={[SLOWEST_TEMPO]}>{graphic}</VideoThemeScope>
    ) : (
      graphic
    ),
  );
}

function _readContinuityShots(
  id: string,
): ReadonlyArray<readonly ContinuityBeat[]> {
  const entry = CONTINUITY_CATALOG.find((candidate) => candidate.id === id);
  assert.ok(entry, id);
  const plan = storyboardSchema.parse(
    JSON.parse(
      fs.readFileSync(
        new URL(`../../../storyboards/${entry.path}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );
  return plan.shots.flatMap((shot) =>
    shot.scene === "continuity" ? [shot.props.beats] : [],
  );
}

const COMPOSITIONS = PARITY_COMPOSITION_IDS.map((id) => ({
  id,
  shots: _readContinuityShots(id),
}));

/** The last beat-local frame before the next beat's transition starts covering this one. */
function _readableEnd(beats: readonly ContinuityBeat[], index: number): number {
  const nextBeat = beats[index + 1];
  const outgoing = nextBeat
    ? getMotionDuration(nextBeat.transition.frames, nextBeat.transition.motion)
    : 0;
  return beats[index].duration - outgoing - 1;
}

/** One row per beat of every in-scope composition, with its shot's beats and its index in them. */
function _listBeatRows(): Array<
  Readonly<{
    id: string;
    beat: ContinuityBeat;
    index: number;
    beats: readonly ContinuityBeat[];
  }>
> {
  return COMPOSITIONS.flatMap(({ id, shots }) =>
    shots.flatMap((beats) =>
      beats.map((beat, index) => ({ id, beat, index, beats })),
    ),
  );
}

/** When each tempo-scaled stage animation of a beat ends, in beat-local frames. */
function _stageAnimationEnds(
  beats: readonly ContinuityBeat[],
  index: number,
): Readonly<Record<string, number>> {
  const { Heading, SharedObject } = slowest.components;
  const token = beats[index].token;
  return {
    heading: motion.scale(Heading.entranceDuration),
    ...(index === 0 && token
      ? {
          sharedObjectFadeIn:
            SHARED_OBJECT_FADE_IN_AT + motion.scale(SharedObject.fadeIn),
        }
      : {}),
    ...(token?.appearance === "outline"
      ? {
          outlineFade: OUTLINE_FADE_AT + motion.scale(SharedObject.outlineFade),
        }
      : {}),
  };
}

test("every in-scope stock loop finishes its animations before the loop ends", () => {
  PARITY_STOCK_PRESET_IDS.forEach((preset) => {
    assert.equal(
      _picture({ preset }, LAST_LOOP_FRAME, true),
      _picture({ preset }, LAST_LOOP_FRAME, false),
      preset,
    );
  });
});

test("every in-scope composition's stage animations finish inside their beats", () => {
  _listBeatRows().forEach(({ id, beat, index, beats }) => {
    const readableEnd = _readableEnd(beats, index);
    Object.entries(_stageAnimationEnds(beats, index)).forEach(([name, end]) => {
      assert.ok(
        end <= readableEnd,
        `${id} ${beat.id} ${name} ends at ${end}, readable until ${readableEnd}`,
      );
    });
  });
});

test("every nested stock graphic has settled before its beat stops being readable", () => {
  _listBeatRows().forEach(({ id, beat, index, beats }) => {
    const content = beat.content;
    if (content.kind === "stock") {
      const frame = sampleStockFrame(
        _readableEnd(beats, index),
        content.settleFrame,
      );
      assert.equal(
        _picture(content.request, frame, true),
        _picture(content.request, frame, false),
        `${id} ${beat.id}`,
      );
    }
  });
});
