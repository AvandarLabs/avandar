import type {
  VideoMotion,
  MotionTokens,
  EasingFunction,
  TimedStep,
} from "./makeVideoMotionFromTokens.types.ts";

export type { VideoMotion } from "./makeVideoMotionFromTokens.types.ts";
import { makeEasingFromToken } from "../makeEasingFromToken/makeEasingFromToken";
import { makeThemedMotionHelpersFromDefaults } from "./makeThemedMotionHelpersFromDefaults";
import type { EasingValue } from "../videoTheme.types";

type MotionTimingSteps = {
  reveal: TimedStep;
  rise: VideoMotion["rise"];
  depart: VideoMotion["depart"];
  surge: VideoMotion["surge"];
  dissolve: VideoMotion["dissolve"];
};
type MotionCycleValues = Pick<
  VideoMotion,
  | "pulse"
  | "drift"
  | "packetFlow"
  | "typing"
  | "loopFade"
  | "pressDepth"
  | "caret"
  | "entranceStyle"
  | "entranceScale"
>;
const CURVES = new Map<string, EasingFunction>();
function _curve(easing: EasingValue): EasingFunction {
  const key = JSON.stringify(easing);
  const cached = CURVES.get(key);
  if (cached) {
    return cached;
  }
  const curve = makeEasingFromToken(easing);
  CURVES.set(key, curve);
  return curve;
}
function _required<Value>({
  value,
  path,
}: Readonly<{
  value: Value | undefined;
  path: string;
}>): Value {
  if (value === undefined) {
    throw new Error(`The theme is missing ${path}`);
  }
  return value;
}
/**
 * The curve a step eases on: its own, or the easing family's curve when
 * `motion.easingProfile` picks one.
 */
function _profileCurve(
  motion: MotionTokens,
): (easing: EasingValue | undefined, path: string) => EasingFunction {
  const profile = motion.easingProfile;
  // Every family is read up front, so the whole menu counts as in use.
  const families = {
    smooth: motion.easingProfiles.smooth,
    snappy: motion.easingProfiles.snappy,
    gentle: motion.easingProfiles.gentle,
  };
  return (easing, path) => {
    return _curve(
      profile === "authored"
        ? _required({
            value: easing,
            path,
          })
        : families[profile],
    );
  };
}
function _getEntranceExitSteps({
  motion,
  scale,
}: Readonly<{ motion: MotionTokens; scale: (frames: number) => number }>): Pick<
  VideoMotion,
  "entrance" | "exit"
> {
  const profileCurve = _profileCurve(motion);
  return {
    entrance: {
      duration: scale(motion.entrance.duration ?? motion.panel),
      easing: profileCurve(motion.entrance.easing, "motion.entrance.easing"),
      distance: _required({
        value: motion.entrance.distance,
        path: "motion.entrance.distance",
      }),
    },
    exit: {
      duration: scale(motion.exit.duration ?? motion.chip),
      easing: profileCurve(motion.exit.easing, "motion.exit.easing"),
      distance: _required({
        value: motion.exit.distance,
        path: "motion.exit.distance",
      }),
    },
  };
}
function _steps({
  motion,
  scale,
}: Readonly<{
  motion: MotionTokens;
  scale: (frames: number) => number;
}>): Pick<VideoMotion, "entrance" | "exit" | "drawOn" | "travel" | "emphasis"> {
  const profileCurve = _profileCurve(motion);
  return {
    ..._getEntranceExitSteps({ motion, scale }),
    drawOn: {
      duration: scale(motion.drawOn.duration ?? motion.hero),
      easing: _curve(
        _required({
          value: motion.drawOn.easing,
          path: "motion.drawOn.easing",
        }),
      ),
    },
    travel: {
      easing: profileCurve(motion.travel.easing, "motion.travel.easing"),
    },
    emphasis: {
      duration: scale(motion.emphasis.duration ?? motion.sheet),
      spring: _required({
        value: motion.emphasis.spring,
        path: "motion.emphasis.spring",
      }),
    },
  };
}
function _getRevealRiseSteps({
  motion,
  scale,
}: Readonly<{ motion: MotionTokens; scale: (frames: number) => number }>): Pick<
  MotionTimingSteps,
  "reveal" | "rise"
> {
  const profileCurve = _profileCurve(motion);
  return {
    reveal: {
      duration: scale(motion.reveal.duration ?? motion.panel),
      easing: profileCurve(motion.reveal.easing, "motion.reveal.easing"),
    },
    rise: {
      duration: scale(motion.rise.duration ?? motion.word),
      easing: profileCurve(motion.rise.easing, "motion.rise.easing"),
      stagger: scale(
        _required({
          value: motion.rise.stagger,
          path: "motion.rise.stagger",
        }) * motion.staggerScale,
      ),
    },
  };
}
function _timingSteps({
  motion,
  scale,
}: Readonly<{
  motion: MotionTokens;
  scale: (frames: number) => number;
}>): MotionTimingSteps {
  const profileCurve = _profileCurve(motion);
  return {
    ..._getRevealRiseSteps({ motion, scale }),
    depart: {
      duration: scale(motion.depart.duration ?? motion.whip),
      easing: _curve(
        _required({
          value: motion.depart.easing,
          path: "motion.depart.easing",
        }),
      ),
    },
    surge: {
      easing: _curve(
        _required({
          value: motion.surge.easing,
          path: "motion.surge.easing",
        }),
      ),
    },
    dissolve: {
      easing: _curve(
        _required({
          value: motion.dissolve.easing,
          path: "motion.dissolve.easing",
        }),
      ),
    },
  };
}
function _cycles(motion: MotionTokens): MotionCycleValues {
  return {
    pulse: {
      period: _required({
        value: motion.pulse.period,
        path: "motion.pulse.period",
      }),
    },
    drift: {
      distance: _required({
        value: motion.drift.distance,
        path: "motion.drift.distance",
      }),
    },
    packetFlow: {
      period: _required({
        value: motion.packetFlow.period,
        path: "motion.packetFlow.period",
      }),
    },
    typing: {
      rate:
        _required({
          value: motion.typing.rate,
          path: "motion.typing.rate",
        }) * motion.tempo,
    },
    loopFade: motion.loopFade,
    pressDepth: motion.pressDepth,
    caret: motion.caret,
    entranceStyle: motion.entranceStyle,
    entranceScale: motion.entranceScale,
  };
}
/**
 * Builds `VideoMotion` from a theme's semantic motion tokens. Use it through
 * `useGraphicMotion` in stock shapes and `useVideoMotion` on the stage.
 */
export function makeVideoMotionFromTokens(motion: MotionTokens): VideoMotion {
  const scale = (frames: number) => {
    return frames / motion.tempo;
  };
  const staggerScale = (frames: number) => {
    return scale(frames * motion.staggerScale);
  };
  const values = {
    tempo: motion.tempo,
    scale,
    scaleStagger: staggerScale,
    curve: _curve,
    press: scale(motion.press),
    chip: scale(motion.chip),
    whip: scale(motion.whip),
    panel: scale(motion.panel),
    sheet: scale(motion.sheet),
    word: scale(motion.word),
    hero: scale(motion.hero),
    ..._steps({
      motion,
      scale,
    }),
    ..._timingSteps({ motion, scale }),
    ..._cycles(motion),
    stagger: {
      list: staggerScale(motion.stagger.list),
      edge: staggerScale(motion.stagger.edge),
      column: staggerScale(motion.stagger.column),
    },
  };
  return { ...values, ...makeThemedMotionHelpersFromDefaults(values) };
}
