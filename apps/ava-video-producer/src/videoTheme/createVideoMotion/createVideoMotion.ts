import { createEasingFromToken } from "../createEasingFromToken/createEasingFromToken";
import type {
  EasingValue,
  ResolvedVideoSemantic,
  SpringValue,
} from "../videoTheme.types";

type EasingFunction = (progress: number) => number;
type MotionTokens = ResolvedVideoSemantic["motion"];

/**
 * Motion a renderer can use directly: durations and staggers already divided
 * by the tempo, easing tokens turned into functions. Cue frames and loop
 * periods stay as authored, so a stock loop stays seamless at any tempo.
 */
export type VideoMotion = Readonly<{
  tempo: number;
  /** Divides an authored animation length by the tempo. Never use it on a cue frame. */
  scale: (frames: number) => number;
  curve: (easing: EasingValue) => EasingFunction;
  press: number;
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
  drawOn: Readonly<{ duration: number; easing: EasingFunction }>;
  travel: Readonly<{ easing: EasingFunction }>;
  emphasis: Readonly<{ duration: number; spring: SpringValue }>;
  pulse: Readonly<{ period: number }>;
  drift: Readonly<{ distance: number }>;
  packetFlow: Readonly<{ period: number }>;
  typing: Readonly<{ rate: number }>;
  stagger: Readonly<{ list: number; edge: number; column: number }>;
}>;

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

function _steps(motion: MotionTokens, scale: (frames: number) => number) {
  return {
    entrance: {
      duration: scale(motion.entrance.duration ?? motion.panel),
      easing: _curve(
        _required(motion.entrance.easing, "motion.entrance.easing"),
      ),
      distance: _required(motion.entrance.distance, "motion.entrance.distance"),
    },
    exit: {
      duration: scale(motion.exit.duration ?? motion.chip),
      easing: _curve(_required(motion.exit.easing, "motion.exit.easing")),
      distance: _required(motion.exit.distance, "motion.exit.distance"),
    },
    drawOn: {
      duration: scale(motion.drawOn.duration ?? motion.hero),
      easing: _curve(_required(motion.drawOn.easing, "motion.drawOn.easing")),
    },
    travel: {
      easing: _curve(_required(motion.travel.easing, "motion.travel.easing")),
    },
    emphasis: {
      duration: scale(motion.emphasis.duration ?? motion.sheet),
      spring: _required(motion.emphasis.spring, "motion.emphasis.spring"),
    },
  };
}

/**
 * Builds `VideoMotion` from a theme's semantic motion tokens. Use it through
 * `useGraphicMotion` in stock shapes and `useVideoMotion` on the stage.
 */
export function createVideoMotion(motion: MotionTokens): VideoMotion {
  const scale = (frames: number) => frames / motion.tempo;
  return {
    tempo: motion.tempo,
    scale,
    curve: _curve,
    press: scale(motion.press),
    chip: scale(motion.chip),
    whip: scale(motion.whip),
    panel: scale(motion.panel),
    sheet: scale(motion.sheet),
    word: scale(motion.word),
    hero: scale(motion.hero),
    ..._steps(motion, scale),
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
    stagger: {
      list: scale(motion.stagger.list),
      edge: scale(motion.stagger.edge),
      column: scale(motion.stagger.column),
    },
  };
}
