/** @jsxRuntime automatic */
/*
 * Stock and continuity animations follow tempo. At the slowest tempo (0.8)
 * every animation still finishes before its stock loop or continuity beat
 * ends: every stock preset, and every continuity composition. Tempo
 * stretches only one-shot animations, never cue frames or repeating motion,
 * so a stock graphic has finished when its picture at the slowest tempo
 * equals its picture at tempo 1. While it animates, the two pictures must
 * differ somewhere, or none of its animation lengths reads tempo. The fixed
 * compositions (`Demo`, `MotionLab`, `TitleStudy`, the title card) need
 * Remotion's frame hook stubbed, so their half of this guard is
 * `src/compositions/__tests__/fixed-compositions-finish-at-the-slowest-tempo`.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { renderToStaticMarkup } from "react-dom/server";
import { ContinuityTimeline } from "../continuity/ContinuityTimeline/ContinuityTimeline";
import { CONTINUITY_CATALOG } from "../continuity/isSceneEntry";
import { MotionSettings } from "../motion-components/MotionSettings/MotionSettings";
import { STOCK_IDS } from "../stock/stockEntry";
import { StockGraphic } from "../stock/StockGraphic/StockGraphic";
import { storyboardSchema } from "../storyboard/schema/schema";
import { makeResolvedVideoThemeFromLibrary } from "../videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { makeVideoMotionFromTokens } from "../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import { BUILT_IN_VIDEO_THEMES } from "../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { VideoThemeScope } from "../videoTheme/VideoThemeScope/VideoThemeScope";
import type { ContinuityBeat } from "../continuity/continuitySchema/continuitySchema";
import type { StockRequest } from "../stock/contracts/StockContract.types";
import type { VideoThemePatch } from "../videoTheme/videoTheme.types";

const SLOWEST_TEMPO: VideoThemePatch = {
  other: { video: { atomic: { tempo: { md: 0.8 } } } },
};

/** The last frame of a 180-frame stock loop. */
const LAST_LOOP_FRAME = 179;

/**
 * Presets whose motion only repeats (orbits, drifts, packet flow). Tempo
 * never stretches a repeating motion, so their pictures match at every
 * tempo.
 */
const REPEATING_MOTION_PRESETS: ReadonlySet<string> = new Set([
  "orbital-system",
  "packet-stream",
  "plexus-field",
]);

/** Frames from the first cue to well inside every one-shot animation. */
const MID_ANIMATION_FRAMES = Array.from({ length: 41 }, (_, index) => {
  return index * 3;
});

/**
 * Cue frames from `ContinuityToken`: the shared object fades in at 12 and an
 * outline starts fading 60 frames into its beat.
 */
const SHARED_OBJECT_FADE_IN_AT = 12;

const OUTLINE_FADE_AT = 60;

const slowest = makeResolvedVideoThemeFromLibrary({
  library: BUILT_IN_VIDEO_THEMES,
  themeId: "classic",
  scope: { patches: [SLOWEST_TEMPO] },
});

const motion = makeVideoMotionFromTokens(slowest.semantic.motion);

function _picture({
  request,
  frame,
  isSlowest,
}: Readonly<{
  request: StockRequest;
  frame: number;
  isSlowest: boolean;
}>): string {
  const graphic = <StockGraphic {...request} frame={frame} />;
  return renderToStaticMarkup(
    isSlowest ? (
      <VideoThemeScope patches={[SLOWEST_TEMPO]}>{graphic}</VideoThemeScope>
    ) : (
      graphic
    ),
  );
}

function _readContinuityShots(id: string): ContinuityBeat[][] {
  const entry = CONTINUITY_CATALOG.find(propEq("id", id));
  assert.ok(entry, id);
  const plan = storyboardSchema.parse(
    JSON.parse(
      fs.readFileSync(
        new URL(`../../storyboards/${entry.path}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );
  return plan.shots.flatMap((shot) => {
    return shot.scene === "continuity" ? [shot.props.beats] : [];
  });
}

const COMPOSITIONS = CONTINUITY_CATALOG.map(({ id }) => {
  return { id, shots: _readContinuityShots(id) };
}).filter(({ shots }) => {
  return shots.length > 0;
});

/**
 * The last beat-local frame before the next beat's transition starts covering
 * this one.
 */
function _readableEnd({
  beats,
  index,
}: Readonly<{
  beats: readonly ContinuityBeat[];
  index: number;
}>): number {
  const nextBeat = beats[index + 1];
  const outgoing = nextBeat
    ? MotionSettings.getMotionDuration({
        frames: nextBeat.transition.frames,
        options: nextBeat.transition.motion,
      })
    : 0;
  return beats[index].duration - outgoing - 1;
}

/**
 * One row per beat of every continuity composition, with its shot's beats
 * and its index in them.
 */
type BeatRow = {
  id: string;
  beat: ContinuityBeat;
  index: number;
  beats: ContinuityBeat[];
};

function _listBeatRows(): BeatRow[] {
  return COMPOSITIONS.flatMap(({ id, shots }) => {
    return shots.flatMap((beats) => {
      return beats.map((beat, index) => {
        return { id, beat, index, beats: [...beats] };
      });
    });
  });
}

/**
 * When each tempo-scaled stage animation of a beat ends, in beat-local frames.
 */
function _stageAnimationEnds({
  beats,
  index,
}: Readonly<{
  beats: readonly ContinuityBeat[];
  index: number;
}>): Record<string, number> {
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

test("every stock loop finishes its animations before the loop ends", () => {
  STOCK_IDS.forEach((preset) => {
    // TypeScript cannot narrow a request over 170 preset ids to the
    // preset-discriminated union, though every preset has a default input.
    const request = { preset } as StockRequest;
    assert.equal(
      _picture({
        request,
        frame: LAST_LOOP_FRAME,
        isSlowest: true,
      }),
      _picture({
        request,
        frame: LAST_LOOP_FRAME,
        isSlowest: false,
      }),
      preset,
    );
  });
});

test("every stock loop with one-shot motion follows tempo while it animates", () => {
  assert.deepEqual(
    STOCK_IDS.filter((preset) => {
      const request = { preset } as StockRequest;
      return (
        !REPEATING_MOTION_PRESETS.has(preset) &&
        MID_ANIMATION_FRAMES.every((frame) => {
          return (
            _picture({
              request,
              frame,
              isSlowest: true,
            }) ===
            _picture({
              request,
              frame,
              isSlowest: false,
            })
          );
        })
      );
    }),
    [],
  );
});

test("a repeating-motion preset draws the same picture at every tempo", () => {
  REPEATING_MOTION_PRESETS.forEach((preset) => {
    const request = { preset } as StockRequest;
    MID_ANIMATION_FRAMES.forEach((frame) => {
      assert.equal(
        _picture({
          request,
          frame,
          isSlowest: true,
        }),
        _picture({
          request,
          frame,
          isSlowest: false,
        }),
        `${preset} at ${frame}`,
      );
    });
  });
});

test("every continuity composition's stage animations finish inside their beats", () => {
  _listBeatRows().forEach(({ id, beat, index, beats }) => {
    const readableEnd = _readableEnd({
      beats,
      index,
    });
    Object.entries(
      _stageAnimationEnds({
        beats,
        index,
      }),
    ).forEach(([name, end]) => {
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
      const frame = ContinuityTimeline.sampleStockFrame({
        frame: _readableEnd({
          beats,
          index,
        }),
        settleFrame: content.settleFrame,
      });
      assert.equal(
        _picture({
          request: content.request,
          frame,
          isSlowest: true,
        }),
        _picture({
          request: content.request,
          frame,
          isSlowest: false,
        }),
        `${id} ${beat.id}`,
      );
    }
  });
});
