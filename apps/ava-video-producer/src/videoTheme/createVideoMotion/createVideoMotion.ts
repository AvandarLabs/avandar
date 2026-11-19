import { createEasingFromToken } from "../createEasingFromToken/createEasingFromToken";
import {
  createThemedMotionHelpers,
  type ThemedMotionHelpers,
} from "./createThemedMotionHelpers";
import type {
  EasingValue,
  ResolvedVideoSemantic,
  SpringValue,
} from "../videoTheme.types";

type EasingFunction = (progress: number) => number;
type MotionTokens = ResolvedVideoSemantic["motion"];
type TimedStep = Readonly<{ duration: number; easing: EasingFunction }>;

/**
 * Motion a renderer can use directly: durations and staggers already divided
 * by the tempo, easing tokens turned into functions, and the `motion.ts`
 * helpers (`ramp`, `enter`, `leave`, `pop`, `press`, `reveal`, `count`,
 * `caretOn`, `loopEnvelope`) with the theme's defaults in place of their literals. Cue
 * frames and loop periods stay as authored, so a stock loop stays seamless
 * at any tempo.
 */
export type VideoMotion = Readonly<{
  tempo: number;
  /**
   * Divides an authored animation length by the tempo. Never use it on a cue
   * frame.
   */
  scale: (frames: number) => number;
  /**
   * Divides an authored stagger by the tempo and multiplies it by
   * `motion.staggerScale`, so a preset's own stagger follows the Stagger
   * option like `stagger.list` does.
   */
  scaleStagger: (frames: number) => number;
  curve: (easing: EasingValue) => EasingFunction;
  chip: number;
  whip: number;
  panel: number;
  sheet: number;
  word: number;
  hero: number;
  entrance: Readonly<{
    duration: number;
    easing: EasingFunction;
    distance: number;
  }>;
  exit: Readonly<{
    duration: number;
    easing: EasingFunction;
    distance: number;
  }>;
  drawOn: TimedStep;
  travel: Readonly<{ easing: EasingFunction }>;
  emphasis: Readonly<{ duration: number; spring: SpringValue }>;
  rise: TimedStep & Readonly<{ stagger: number }>;
  depart: TimedStep;
  surge: Readonly<{ easing: EasingFunction }>;
  dissolve: Readonly<{ easing: EasingFunction }>;
  /** Loop fades bound a loop, so tempo never changes them. */
  loopFade: Readonly<{ graphic: number; film: number }>;
  pressDepth: number;
  caret: Readonly<{ halfPeriod: number }>;
  entranceStyle: MotionTokens["entranceStyle"];
  pulse: Readonly<{ period: number }>;
  drift: Readonly<{ distance: number }>;
  packetFlow: Readonly<{ period: number }>;
  typing: Readonly<{ rate: number }>;
  stagger: Readonly<{ list: number; edge: number; column: number }>;
}> &
  ThemedMotionHelpers;

const CURVES = new Map<string, EasingFunction>();

function _curve(easing: EasingValue): EasingFunction {
  const key = JSON.stringify(easing);
  const cached = CURVES.get(key);
  if (cached) {
    return cached;
  }
  const curve = createEasingFromToken(easing);
  CURVES.set(key, curve);
  return curve;
}

function _required<Value>(value: Value | undefined, path: string): Value {
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
      profile === "authored" ? _required(easing, path) : families[profile],
    );
  };
}

function _steps(motion: MotionTokens, scale: (frames: number) => number) {
  const profileCurve = _profileCurve(motion);
  return {
    entrance: {
      duration: scale(motion.entrance.duration ?? motion.panel),
      easing: profileCurve(motion.entrance.easing, "motion.entrance.easing"),
      distance: _required(motion.entrance.distance, "motion.entrance.distance"),
    },
    exit: {
      duration: scale(motion.exit.duration ?? motion.chip),
      easing: profileCurve(motion.exit.easing, "motion.exit.easing"),
      distance: _required(motion.exit.distance, "motion.exit.distance"),
    },
    drawOn: {
      duration: scale(motion.drawOn.duration ?? motion.hero),
      easing: _curve(_required(motion.drawOn.easing, "motion.drawOn.easing")),
    },
    travel: {
      easing: profileCurve(motion.travel.easing, "motion.travel.easing"),
    },
    emphasis: {
      duration: scale(motion.emphasis.duration ?? motion.sheet),
      spring: _required(motion.emphasis.spring, "motion.emphasis.spring"),
    },
  };
}

function _timingSteps(motion: MotionTokens, scale: (frames: number) => number) {
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
        _required(motion.rise.stagger, "motion.rise.stagger") *
          motion.staggerScale,
      ),
    },
    depart: {
      duration: scale(motion.depart.duration ?? motion.whip),
      easing: _curve(_required(motion.depart.easing, "motion.depart.easing")),
    },
    surge: {
      easing: _curve(_required(motion.surge.easing, "motion.surge.easing")),
    },
    dissolve: {
      easing: _curve(
        _required(motion.dissolve.easing, "motion.dissolve.easing"),
      ),
    },
  };
}

function _cycles(motion: MotionTokens) {
  return {
    pulse: { period: _required(motion.pulse.period, "motion.pulse.period") },
    drift: {
      distance: _required(motion.drift.distance, "motion.drift.distance"),
    },
    packetFlow: {
      period: _required(motion.packetFlow.period, "motion.packetFlow.period"),
    },
    typing: {
      rate: _required(motion.typing.rate, "motion.typing.rate") * motion.tempo,
    },
    loopFade: motion.loopFade,
    pressDepth: motion.pressDepth,
    caret: motion.caret,
    entranceStyle: motion.entranceStyle,
  };
}

/**
 * Builds `VideoMotion` from a theme's semantic motion tokens. Use it through
 * `useGraphicMotion` in stock shapes and `useVideoMotion` on the stage.
 */
export function createVideoMotion(motion: MotionTokens): VideoMotion {
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
    ..._steps(motion, scale),
    ..._timingSteps(motion, scale),
    ..._cycles(motion),
    stagger: {
      list: staggerScale(motion.stagger.list),
      edge: staggerScale(motion.stagger.edge),
      column: staggerScale(motion.stagger.column),
    },
  };
  return { ...values, ...createThemedMotionHelpers(values) };
}
